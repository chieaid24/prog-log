-- Minimal stand-in for the pieces of a Supabase instance the migrations
-- depend on, so they can run against a plain Postgres 17 in tests. Mirrors
-- Supabase behavior: auth.uid() reads the JWT sub claim from a session GUC,
-- and the `authenticated` role is subject to RLS.
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key,
  email text
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
