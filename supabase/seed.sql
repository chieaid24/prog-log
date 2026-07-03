-- Local/dev seed: one dev user, their timezone settings row, and the 5
-- starter projects from PRD section 1. Dev-only — production starts empty and
-- projects are created through the app.

-- A GoTrue-complete user row: aud/role, confirmed email, empty-string token
-- columns (GoTrue scans these as strings — NULLs break magic-link login), and
-- a matching identities row. Password-less; sign in via magic link (mailpit).
insert into auth.users (
  instance_id, id, aud, role, email,
  email_confirmed_at, created_at, updated_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'dev@example.com',
  now(), now(), now(), null,
  '{"provider": "email", "providers": ["email"]}', '{}', false,
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'email',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "dev@example.com", "email_verified": true}',
  null, now(), now()
)
on conflict (id) do nothing;

insert into app_settings (user_id, timezone)
values ('00000000-0000-0000-0000-000000000001', 'America/Toronto')
on conflict (user_id) do nothing;

insert into projects (user_id, name, category, color, status) values
  ('00000000-0000-0000-0000-000000000001', 'Work',     'Work',     '#7c8cf8', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'AI-M',     'Research', '#c084fc', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Website',  'Personal', '#67e8f9', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Turkish',  'Learning', '#fbbf24', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Mandarin', 'Learning', '#f472b6', 'active');

-- Example aliases (ADR-0010): forgiving capture matching for AI-M.
insert into project_aliases (user_id, project_id, alias)
select '00000000-0000-0000-0000-000000000001', id, a.alias
from projects, (values ('aim'), ('mental health')) as a(alias)
where user_id = '00000000-0000-0000-0000-000000000001' and name = 'AI-M'
on conflict do nothing;
