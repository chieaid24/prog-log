-- Day-level daily reflection (ADR-0017): one free-text line per (user, day),
-- a property of the day rather than any one project. Mirrors the entries path
-- (ADR-0001): a single upsert RPC set_reflection is the only write surface, so
-- every capture path (web add-entry flow, Discord /reflect) overwrites through
-- one place. Owner RLS policy and explicit grants match the rest of the schema
-- (ADR-0012); types are hand-maintained (ADR-0006).

create table daily_reflections (
  user_id    uuid not null references auth.users (id) default auth.uid(),
  entry_date date not null default current_date,
  reflection text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One reflection per (user, day); every write path upserts on this key.
  primary key (user_id, entry_date)
);

create index daily_reflections_user_date_idx
  on daily_reflections (user_id, entry_date desc);

alter table daily_reflections enable row level security;

create policy "own reflections" on daily_reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- New tables need their own grants (ADR-0012); RLS stays the row boundary.
grant select, insert, update, delete
  on table public.daily_reflections
  to authenticated, service_role;

-- Overwrite the day's reflection (ADR-0017). entry_date is the calendar day in
-- the user's stored timezone at capture (ADR-0004), or an explicit past day so
-- reflections stay editable for any date; frozen thereafter. created_at is kept
-- across overwrites, updated_at bumped. Security invoker: the browser writes
-- under RLS as auth.uid(); service-role capture routes pass the owner id.
create function set_reflection(
  p_reflection text,
  p_user       uuid default auth.uid(),
  p_date       date default null
) returns daily_reflections language sql as $$
  insert into daily_reflections (user_id, entry_date, reflection)
  values (
    p_user,
    coalesce(
      p_date,
      (now() at time zone coalesce(
        (select timezone from app_settings where user_id = p_user),
        'America/Toronto'
      ))::date
    ),
    p_reflection
  )
  on conflict (user_id, entry_date) do update set
    reflection = excluded.reflection,
    updated_at = now()
  returning *;
$$;

grant execute on function public.set_reflection to authenticated, service_role;
