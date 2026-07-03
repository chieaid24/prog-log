-- Minimal stand-in for the pieces of a Supabase instance the migrations and
-- seed depend on, so they can run against a plain Postgres 17 in tests.
-- Mirrors Supabase behavior: auth.uid() reads the JWT sub claim from a
-- session GUC; `anon` and `authenticated` are subject to RLS while
-- `service_role` bypasses it (role attribute, as on the platform). Table
-- privileges are deliberately NOT granted here — the role_grants migration
-- carries them, so tests exercise the real grants.
create schema if not exists auth;

-- Columns kept in step with what supabase/seed.sql inserts.
create table if not exists auth.users (
  instance_id                uuid,
  id                         uuid primary key,
  aud                        text,
  role                       text,
  email                      text,
  email_confirmed_at         timestamptz,
  created_at                 timestamptz,
  updated_at                 timestamptz,
  last_sign_in_at            timestamptz,
  raw_app_meta_data          jsonb,
  raw_user_meta_data         jsonb,
  is_super_admin             boolean,
  confirmation_token         text,
  recovery_token             text,
  email_change               text,
  email_change_token_new     text,
  email_change_token_current text,
  phone_change               text,
  phone_change_token         text,
  reauthentication_token     text
);

create table if not exists auth.identities (
  id              uuid primary key,
  user_id         uuid references auth.users (id),
  provider_id     text,
  provider        text,
  identity_data   jsonb,
  last_sign_in_at timestamptz,
  created_at      timestamptz,
  updated_at      timestamptz
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
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
