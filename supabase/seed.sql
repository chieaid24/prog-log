-- Local/dev seed: one dev user, their timezone settings row, and the 5
-- starter projects from PRD section 1. Dev-only — production starts empty and
-- projects are created through the app.

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'dev@example.com')
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
