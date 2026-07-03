-- Explicit data-access grants for the PostgREST roles. Current Supabase
-- Postgres images no longer hand the API roles DML on new tables by default
-- (surfaced by manual validation against the local stack: service_role got
-- "permission denied for table entries"). RLS remains the row boundary;
-- these are the table-level gates. New tables need their own grants — add
-- them in the migration that creates the table.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.projects, public.entries, public.app_settings, public.project_aliases
  to authenticated, service_role;

-- The keep-alive workflow pings projects with the anon key: RLS yields zero
-- rows, but the select itself must be permitted. Nothing else opens to anon.
grant select on table public.projects to anon;

-- log_entry is security invoker (the caller's RLS applies) — both API roles
-- that capture entries need to execute it.
grant execute on function public.log_entry to authenticated, service_role;
