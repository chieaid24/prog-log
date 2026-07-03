-- Project aliases (PRD section 8 stretch; ADR-0010): extra names that resolve
-- to one Project during capture (Discord, Apple Shortcut). The alias namespace
-- is per user across all Projects — one alias can never point at two Projects,
-- enforced here, not in app code.

create table project_aliases (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) default auth.uid(),
  project_id uuid not null references projects (id) on delete cascade,
  alias      text not null check (length(btrim(alias)) > 0),
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness per user: 'AIM' and 'aim' are the same alias.
create unique index project_aliases_user_lower_alias_idx
  on project_aliases (user_id, lower(alias));
create index project_aliases_project_idx on project_aliases (project_id);

alter table project_aliases enable row level security;

create policy "own project aliases" on project_aliases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
