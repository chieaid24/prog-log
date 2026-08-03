-- Expeditions (ADR-0018): standalone topic-to-video todo items. Not tied to a
-- Project (unlike an Entry) and not day-grained (unlike a Reflection): a row is
-- created once, sits open in a hand-ordered todo list, and persists as an
-- answered artifact once a YouTube video is attached. Owner RLS policy and
-- explicit grants match the rest of the schema (ADR-0012); types are
-- hand-maintained (ADR-0006). All writes funnel through the security-invoker
-- RPCs below - the single write surface, mirroring log_entry (ADR-0001) and
-- set_reflection (ADR-0017).

-- Todo-first order is load-bearing for reads; do not reorder (ADR-0018).
create type expedition_status as enum ('open', 'answered');

create table expeditions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) default auth.uid(),
  title            text not null check (btrim(title) <> ''),
  description      text,              -- optional short elaboration
  status           expedition_status not null default 'open',
  position         integer not null,  -- manual todo order; new items append at max+1
  youtube_url      text,              -- answer fields, set together by answer_expedition
  youtube_video_id text,
  youtube_title    text,
  answered_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index expeditions_user_position_idx on expeditions (user_id, status, position);
create index expeditions_user_answered_idx on expeditions (user_id, answered_at desc)
  where status = 'answered';   -- partial index for the showcase feed

alter table expeditions enable row level security;

create policy "own expeditions" on expeditions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- New tables need their own grants (ADR-0012); RLS stays the row boundary.
grant select, insert, update, delete
  on table public.expeditions
  to authenticated, service_role;

-- Append a new open Expedition at the bottom of the todo list. Shared by web
-- and Discord /expedition (service-role passes the owner id), so both capture
-- paths use one insert. max(position) spans all the user's rows, which is
-- always >= the open set's max, so the item lands at the todo bottom even when
-- answered rows hold stale higher positions.
create function add_expedition(
  p_title       text,
  p_description text default null,
  p_user        uuid default auth.uid()
) returns expeditions language sql as $$
  insert into expeditions (user_id, title, description, position)
  values (
    p_user, p_title, p_description,
    coalesce((select max(position) from expeditions where user_id = p_user), 0) + 1
  )
  returning *;
$$;

-- Persist a manual drag order: positions become the array order (1-based).
-- An integer reindex of the open set - fine at single-user list sizes (ADR-0018).
create function reorder_expeditions(
  p_ids  uuid[],
  p_user uuid default auth.uid()
) returns setof expeditions language sql as $$
  update expeditions e
  set position = t.ord, updated_at = now()
  from unnest(p_ids) with ordinality as t(id, ord)
  where e.id = t.id and e.user_id = p_user
  returning e.*;
$$;

-- Attach the answer video. The link is required to answer (ADR-0018), so an
-- empty or missing url is rejected before any write.
create function answer_expedition(
  p_id       uuid,
  p_url      text,
  p_video_id text default null,
  p_title    text default null,
  p_user     uuid default auth.uid()
) returns expeditions language plpgsql as $$
declare
  result expeditions;
begin
  if p_url is null or btrim(p_url) = '' then
    raise exception 'answer_expedition requires a youtube url'
      using errcode = '22023'; -- invalid_parameter_value
  end if;
  update expeditions
  set status           = 'answered',
      answered_at      = now(),
      youtube_url      = p_url,
      youtube_video_id = p_video_id,
      youtube_title    = p_title,
      updated_at       = now()
  where id = p_id and user_id = p_user
  returning * into result;
  return result;
end;
$$;

-- Send an answered Expedition back to the bottom of the todo list. The stored
-- link is retained for a later re-answer; answered_at clears because an open
-- item is not answered (re-answering restamps it).
create function reopen_expedition(
  p_id   uuid,
  p_user uuid default auth.uid()
) returns expeditions language sql as $$
  update expeditions
  set status      = 'open',
      answered_at = null,
      position    = coalesce((select max(position) from expeditions where user_id = p_user), 0) + 1,
      updated_at  = now()
  where id = p_id and user_id = p_user
  returning *;
$$;

-- Edit the text fields; an edit form submits both, so null clears description.
create function update_expedition(
  p_id          uuid,
  p_title       text,
  p_description text default null,
  p_user        uuid default auth.uid()
) returns expeditions language sql as $$
  update expeditions
  set title = p_title, description = p_description, updated_at = now()
  where id = p_id and user_id = p_user
  returning *;
$$;

create function delete_expedition(
  p_id   uuid,
  p_user uuid default auth.uid()
) returns void language sql as $$
  delete from expeditions where id = p_id and user_id = p_user;
$$;

-- Security invoker: browser calls run under RLS as auth.uid(); service-role
-- capture routes pass the owner id explicitly.
grant execute on function
  public.add_expedition, public.reorder_expeditions, public.answer_expedition,
  public.reopen_expedition, public.update_expedition, public.delete_expedition
  to authenticated, service_role;
