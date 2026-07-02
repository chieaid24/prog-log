-- The calendar's day cells open quick add for that clicked date (PRD 3.1.2),
-- so the shared write path needs an explicit-date variant. p_date defaults to
-- null = "today in the user's stored timezone" (ADR-0004), which is what every
-- capture path (Discord, Apple Shortcut) keeps using. Drop + recreate rather
-- than overload: PostgREST rpc dispatch cannot disambiguate overloads.

drop function log_entry(uuid, time_size, text, text, uuid);

create function log_entry(
  p_project     uuid,
  p_time        time_size,
  p_milestone   text default null,
  p_description text default null,
  p_user        uuid default auth.uid(),
  p_date        date default null
) returns entries language sql as $$
  insert into entries (user_id, project_id, entry_date, time_spent, milestone, description)
  values (
    p_user, p_project,
    coalesce(
      p_date,
      (now() at time zone coalesce(
        (select timezone from app_settings where user_id = p_user),
        'America/Toronto'
      ))::date
    ),
    p_time, p_milestone, p_description
  )
  on conflict (user_id, project_id, entry_date) do update set
    time_spent  = greatest(entries.time_spent, excluded.time_spent),
    milestone   = coalesce(excluded.milestone,   entries.milestone),
    description = coalesce(excluded.description, entries.description)
  returning *;
$$;
