-- Foundation schema: time_size enum, projects, entries, indexes, RLS.
-- PRD section 2; grain and accumulate semantics pinned by ADR-0001.

-- Ascending-effort order is load-bearing: log_entry uses greatest() on this
-- enum, which follows declaration order. Do not reorder (ADR-0001).
create type time_size as enum ('small', 'medium', 'large');
-- small = under 1h, medium = 1-3h, large = 3h+

create table projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) default auth.uid(),
  name        text not null,
  category    text check (category in ('Work', 'Research', 'Personal', 'Learning')),
  status      text not null default 'active' check (status in ('active', 'archived')),
  color       text,
  started     date,
  description text,
  created_at  timestamptz not null default now()
);

create table entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) default auth.uid(),
  project_id  uuid not null references projects (id) on delete cascade,
  entry_date  date not null default current_date,
  time_spent  time_size not null,
  milestone   text,         -- optional headline; non-null = Throwback-eligible
  description text,         -- optional, deemphasized detail
  created_at  timestamptz not null default now(),
  -- One Entry per (user, project, day); capture paths upsert-accumulate (ADR-0001).
  unique (user_id, project_id, entry_date)
);

create index entries_user_date_idx on entries (user_id, entry_date desc);
create index entries_project_idx   on entries (project_id);
create index entries_milestone_idx on entries (user_id, entry_date)
  where milestone is not null;   -- partial index for the Throwback feed

alter table projects enable row level security;
alter table entries  enable row level security;

create policy "own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own entries" on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
