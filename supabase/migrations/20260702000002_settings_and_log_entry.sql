-- Per-user settings (timezone, ADR-0004) and the single shared write path
-- log_entry (ADR-0001). Every capture surface (web quick add, Discord /log,
-- Apple Shortcut) writes through log_entry so the accumulate rule lives in
-- exactly one place.

create table app_settings (
  user_id  uuid primary key references auth.users (id) default auth.uid(),
  timezone text not null default 'America/Toronto'
);

alter table app_settings enable row level security;

create policy "own settings" on app_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Upsert-accumulate (ADR-0001): peak time_spent wins (greatest over the
-- ascending time_size enum) and milestone/description are never nulled by a
-- later bare re-log. entry_date is the calendar day in the user's stored
-- timezone at capture, frozen thereafter (ADR-0004). Missing settings row
-- falls back to the documented default timezone rather than erroring.
-- Security invoker: browser calls run under RLS as auth.uid(); service-role
-- capture routes pass the owner id explicitly.
create function log_entry(
  p_project     uuid,
  p_time        time_size,
  p_milestone   text default null,
  p_description text default null,
  p_user        uuid default auth.uid()
) returns entries language sql as $$
  insert into entries (user_id, project_id, entry_date, time_spent, milestone, description)
  values (
    p_user, p_project,
    (now() at time zone coalesce(
      (select timezone from app_settings where user_id = p_user),
      'America/Toronto'
    ))::date,
    p_time, p_milestone, p_description
  )
  on conflict (user_id, project_id, entry_date) do update set
    time_spent  = greatest(entries.time_spent, excluded.time_spent),
    milestone   = coalesce(excluded.milestone,   entries.milestone),
    description = coalesce(excluded.description, entries.description)
  returning *;
$$;
