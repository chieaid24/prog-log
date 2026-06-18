# PRD: Work Log & Project Tracker (Next.js + Supabase)

**Owner:** Aidan
**Status:** Draft, ready to build
**Goal:** A self-hosted daily work log that doubles as a portfolio project. Port the Notion prototype to a custom app with a flexible Throwback feed (relative-age "insights"), a contribution-style heatmap, and frictionless capture from a Discord bot and an Apple Shortcut. Must run entirely on free tiers.

---

## 1. Problem & goal

Track which projects got worked on each day (Work, AI-M, Website, Turkish, Mandarin, etc.) with near-zero logging friction. The core unit is simple: **a project, a date, and a rough time commitment.** Most days are just "general work" with no extra text. Occasionally a day carries a **milestone** (a short line describing something notable), and rarely a longer **description**. Then answer two questions well:

1. How did I spend my month? (days worked, time-commitment distribution, per-project breakdown)
2. What did I accomplish a while back? (Throwback feed of milestones)

The Notion version covers daily logging and a milestone list. This build exists to nail the Throwback feed, give a real heatmap, and be hosted at on Vercel at log.aidanchien.com.

### Design principle
The project is the thing being tracked. Milestone and description are both optional and most entries have neither. Logging a normal day should be: pick project, pick time commitment, done.

### Non-goals (v1)
- Multi-user / team features. Single user (you), though the schema is multi-user-safe via RLS.
- Exact hour tracking. Time is t-shirt-sized on purpose (Small / Medium / Large).

---

## 2. Core concepts (data model)

Two tables, plus a one-row per-user settings record (timezone). Everything else is a query.

### `projects`
The master list you log against. Archive instead of delete to preserve history.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid | FK to auth.users, default auth.uid() |
| name | text | required |
| category | text | check: Work / Research / Personal / Learning |
| status | text | check: active / archived, default active |
| color | text | optional, for theming chips |
| started | date | optional |
| description | text | optional |
| created_at | timestamptz | default now() |

### `entries`
One row per project worked on per day. Only project, date, and time commitment are required.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid | FK to auth.users, default auth.uid() |
| project_id | uuid | FK to projects, on delete cascade |
| entry_date | date | default current_date |
| time_spent | enum | small / medium / large (required) |
| milestone | text | **optional**, null on most days. When present, this entry is Throwback-eligible. This is the headline text. |
| description | text | **optional**, deemphasized. Longer "what I actually did" detail, rarely filled. |
| created_at | timestamptz | default now() |

Note the shift from the earlier draft: there is no required one-line "log" field, and the boolean breakthrough flag is gone. A milestone is simply a non-null `milestone` text. An entry with no milestone and no description is a valid, normal "general work" day.

### DDL

```sql
create type time_size as enum ('small','medium','large');
-- small = under 1h, medium = 1-3h, large = 3h+

create table projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  name        text not null,
  category    text check (category in ('Work','Research','Personal','Learning')),
  status      text not null default 'active' check (status in ('active','archived')),
  color       text,
  started     date,
  description text,
  created_at  timestamptz not null default now()
);

create table entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) default auth.uid(),
  project_id  uuid not null references projects(id) on delete cascade,
  entry_date  date not null default current_date,
  time_spent  time_size not null,
  milestone   text,         -- optional headline; non-null = Throwback-eligible
  description text,         -- optional, deemphasized detail
  created_at  timestamptz not null default now(),
  unique (user_id, project_id, entry_date)   -- one Entry per project per day (ADR-0001)
);

create index entries_user_date_idx on entries (user_id, entry_date desc);
create index entries_project_idx   on entries (project_id);
create index entries_milestone_idx on entries (user_id, entry_date)
  where milestone is not null;   -- partial index for the Throwback feed
```

### Row Level Security

```sql
alter table projects enable row level security;
alter table entries  enable row level security;

create policy "own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own entries" on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Time-commitment-to-weight mapping for heatmaps and "intensity" scoring: small = 1, medium = 2, large = 3. Keep it in app code or a small SQL `case`, not a column.

### Settings & the shared write path

A one-row-per-user `app_settings` holds the timezone (default `America/Toronto`,
changed manually — see ADR-0004). All capture paths resolve "today" through it.

```sql
create table app_settings (
  user_id  uuid primary key references auth.users(id) default auth.uid(),
  timezone text not null default 'America/Toronto'
);
alter table app_settings enable row level security;
create policy "own settings" on app_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Every capture path (web quick-add, Discord `/log`, Apple Shortcut) writes through one
function so the one-per-(project, day) accumulate rule (ADR-0001) lives in exactly one
place. It upserts: peak `time_spent` wins, and `milestone`/`description` are never
nulled by a later bare re-log. `entry_date` is derived in the user's timezone. The
browser calls it under RLS (`p_user` defaults to `auth.uid()`); the service-role
capture routes pass the owner id explicitly.

```sql
create function log_entry(
  p_project     uuid,
  p_time        time_size,
  p_milestone   text default null,
  p_description text default null,
  p_user        uuid default auth.uid()   -- service-role callers pass the owner id
) returns entries language sql as $$
  insert into entries (user_id, project_id, entry_date, time_spent, milestone, description)
  values (
    p_user, p_project,
    (now() at time zone (select timezone from app_settings where user_id = p_user))::date,
    p_time, p_milestone, p_description
  )
  on conflict (user_id, project_id, entry_date) do update set
    time_spent  = greatest(entries.time_spent, excluded.time_spent),
    milestone   = coalesce(excluded.milestone,   entries.milestone),
    description = coalesce(excluded.description, entries.description)
  returning *;
$$;
```

`greatest()` on `time_spent` relies on the `time_size` enum being declared in
ascending-effort order — do not reorder it.

---

## 3. Features & the queries behind them

### 3.1 Daily log (the calendar / heatmap)
The daily log offers **two toggleable views** over the same underlying entries: a **heatmap** for at-a-glance intensity, and a **calendar** for which projects each day belonged to.

#### 3.1.1 Heatmap view (overall hours worked)
A GitHub-contribution-style year heatmap is the primary "days worked" view. Each cell's color intensity comes from summed time-commitment weight that day — a single monochrome scale, so it reads as *overall* effort regardless of project.

```sql
select
  entry_date,
  count(*) as entries,
  sum(case time_spent when 'small' then 1 when 'medium' then 2 when 'large' then 3 end) as weight
from entries
where user_id = auth.uid()
  and entry_date >= current_date - interval '1 year'
group by entry_date;
```

Day boundaries follow the user's timezone (ADR-0004); cells bucket the summed weight into ~5 intensity levels. Clicking a cell opens that day's entries and a quick-add form.

#### 3.1.2 Calendar view (project color banners)
A month-grid view styled like Google Calendar. Each past day's cell shows one **color banner per distinct project worked that day**, using the project's `color`. Multiple projects in one day stack as multiple banners (cap the visible count, e.g. 3, then a "+N" overflow). This answers "what did I work on?" where the heatmap only answers "how much?". Project `color` is auto-assigned at create (§2), so every banner renders a real color.

Per-day, per-project rollup that drives the banners:

```sql
select
  e.entry_date,
  p.id   as project_id,
  p.name as project_name,
  p.color,
  count(*) as entries,
  sum(case e.time_spent when 'small' then 1 when 'medium' then 2 when 'large' then 3 end) as weight
from entries e
join projects p on p.id = e.project_id
where e.user_id = auth.uid()
  and e.entry_date >= date_trunc('month', current_date) - interval '1 month'
group by e.entry_date, p.id, p.name, p.color
order by e.entry_date, weight desc;
```

Order banners by `weight desc` so the day's dominant project sits on top. Clicking a day opens that day's entries and the quick-add form (same as a heatmap cell). The two views share the cell-click behavior; only the rendering differs.

### 3.2 Quick add
The form should make the common case trivial:

- **Project** dropdown (active projects only): required. The dropdown also exposes a **"+ New project"** affordance at the bottom — selecting it reveals an inline mini-form (name required; category and color optional) without leaving the quick-add flow. On submit, the project is created, auto-selected, and the entry continues. Avoids a context switch to a separate "manage projects" screen for the common "started something new today" case.
- **Time spent** segmented control (S / M / L): required.
- **Milestone** text: optional, single line, the headline. Empty by default.
- **Description** text: optional, collapsed/secondary, deemphasized. Empty by default.
- Defaults `entry_date` to today.

Active-only picker:

```sql
select id, name, category, color
from projects
where user_id = auth.uid() and status = 'active'
order by name;
```

Inline new-project create (fired by the dropdown's "+ New project" option):

```sql
insert into projects (user_id, name, category, color)
values (auth.uid(), :name, :category, :color)
returning id, name, category, color;
```

The returned `id` is set as the entry's `project_id` immediately. Name should be deduped per user (case-insensitive) — if a match exists, select it instead of inserting.

UI emphasis: project and time spent are the two always-visible controls. Milestone is a single optional line. Description is tucked behind a "+ add detail" affordance so it never adds friction to a normal entry.

### 3.3 Monthly breakdown
"How I spent my month": days worked, total entries, time-commitment split, milestones.

```sql
select
  date_trunc('month', entry_date)::date as month,
  count(distinct entry_date)            as days_worked,
  count(*)                              as entries,
  count(*) filter (where time_spent = 'large')   as large_sessions,
  count(*) filter (where milestone is not null)  as milestones
from entries
where user_id = auth.uid()
group by 1
order by 1 desc;
```

Per-project breakdown for the current month (stacked bar by project and time commitment):

```sql
select p.name, e.time_spent, count(*)
from entries e
join projects p on p.id = e.project_id
where e.user_id = auth.uid()
  and date_trunc('month', e.entry_date) = date_trunc('month', current_date)
group by p.name, e.time_spent
order by p.name;
```

### 3.4 Throwbacks (the headline feature)
A Throwback resurfaces a past Milestone with a human relative-age label ("3 months
ago you shipped X", "2 years ago…"). It is intentionally loose — a varied,
discovery-style insights feed, **not** a strict same-calendar-day rule (which sheds
the Feb-29 / month-end clamping traps entirely). A Milestone is simply a non-null
`milestone`.

The candidate pool is every past Milestone, each with its humanized age (computed in
the user's timezone):

```sql
select e.milestone, e.entry_date, p.name as project_name, p.color,
  (((now() at time zone st.timezone)::date) - e.entry_date) as days_ago
from entries e
join projects p     on p.id = e.project_id
cross join app_settings st
where e.user_id = auth.uid()
  and st.user_id = auth.uid()
  and e.milestone is not null
  and e.entry_date < ((now() at time zone st.timezone)::date);
```

Selection is **date-seeded and stable per day**: a deterministic shuffle seeded by
today's date picks the items, so the on-page feed and the morning Discord digest show
the **same** throwbacks and refreshing never reshuffles. Defaults: the page shows up
to **3**, the digest sends the top **1**; ages render to the nicest unit ("4 months
ago", "1 year ago"); no bias toward round marks; an empty pool means no feed and a
silent digest. One query/view plus a seeded pick = one source of truth for page and
digest.

### 3.5 Archive (not delete)
Toggling a project to `archived` removes it from the quick-add picker but keeps every entry. Old projects still appear in monthly breakdowns and Throwbacks. Hard delete only via an explicit admin action.

---

## 4. Capture layer (zero-friction logging)

### 4.1 Discord bot (primary mobile capture)
Slash command via Discord's Interactions Endpoint, not a Gateway websocket — Discord POSTs each interaction to your URL, so nothing runs 24/7 and it stays free.

- **Where it runs:** a Next.js API route at `/api/discord` on Vercel (ADR-0002). Discord POSTs each interaction to that URL.
- **Auth:** verify the Ed25519 request signature against your app's public key (`X-Signature-Ed25519` + `X-Signature-Timestamp` headers) — Discord refuses to register an endpoint that fails this. Then restrict to your own Discord user id; ignore everyone else.
- **Command:** a single `/log` slash command with typed options, so there's no syntax to memorize:
  - `project` — string, **autocomplete** from active project names.
  - `time` — choice: small / medium / large.
  - `milestone` — optional string, the headline.
  - `description` — optional string, non-milestone detail.
- **Reply within 3s:** the insert is fast, so answer inline (type 4) with an ephemeral confirmation. If you add slower work later, defer (type 5) and edit the response.
- **PING handshake:** answer interaction type 1 (PING) with type 1 (PONG) — Discord pings on save and periodically.
- **Project resolution (never guess):** autocomplete supplies an exact active project (a separate type-4 interaction answered with type 8). A raw free-text submission that doesn't resolve to exactly one active project is rejected with an ephemeral error listing the closest names — the bot never silently logs to the wrong project.

Route handler sketch (Next.js App Router):

```ts
// app/api/discord/route.ts  — Discord interactions endpoint (ADR-0002)
import { createClient } from "@supabase/supabase-js";
import nacl from "tweetnacl";

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;
const OWNER = process.env.OWNER_USER_ID!;
const hex = (h: string) => Uint8Array.from(h.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
const reply = (content: string) =>
  Response.json({ type: 4, data: { content, flags: 64 } }); // flags 64 = ephemeral

export async function POST(req: Request) {
  const sig = req.headers.get("x-signature-ed25519");
  const ts  = req.headers.get("x-signature-timestamp");
  const body = await req.text();                          // raw body required to verify
  const ok = sig && ts && nacl.sign.detached.verify(
    new TextEncoder().encode(ts + body), hex(sig), hex(PUBLIC_KEY));
  if (!ok) return new Response("bad signature", { status: 401 });

  const i = JSON.parse(body);
  if (i.type === 1) return Response.json({ type: 1 });    // PONG

  const userId = i.member?.user?.id ?? i.user?.id;
  if (userId !== process.env.DISCORD_USER_ID) return reply("not authorized");

  const opt = Object.fromEntries((i.data.options ?? []).map((o: any) => [o.name, o.value]));
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // exact, case-insensitive resolution (ilike, no wildcards) — never guess
  const { data: hit } = await db.from("projects")
    .select("id, name").eq("user_id", OWNER).eq("status", "active")
    .ilike("name", opt.project);
  if (!hit || hit.length !== 1) {
    const { data: near } = await db.from("projects")
      .select("name").eq("user_id", OWNER).eq("status", "active")
      .ilike("name", `%${opt.project}%`);
    const hint = near?.length ? ` did you mean: ${near.map((p) => p.name).join(", ")}?` : "";
    return reply(`no single active project matches "${opt.project}".${hint}`);
  }

  // one shared write path: upsert-accumulate in the user's timezone
  await db.rpc("log_entry", {
    p_project: hit[0].id, p_time: opt.time,
    p_milestone: opt.milestone ?? null, p_description: opt.description ?? null,
    p_user: OWNER,
  });
  return reply(`logged ${hit[0].name} · ${opt.time}`);
}
```

Register the `/log` command once, then paste your `https://log.aidanchien.com/api/discord` URL into the app's **Interactions Endpoint URL** in the Discord Developer Portal:

```
PUT https://discord.com/api/v10/applications/<APP_ID>/commands
Authorization: Bot <BOT_TOKEN>

[ { "name": "log", "description": "log a work entry", "type": 1, "options": [
  { "name": "project", "type": 3, "description": "project", "required": true, "autocomplete": true },
  { "name": "time", "type": 3, "description": "time spent", "required": true, "choices": [
      { "name": "small", "value": "small" },
      { "name": "medium", "value": "medium" },
      { "name": "large", "value": "large" } ] },
  { "name": "milestone", "type": 3, "description": "milestone (optional)", "required": false },
  { "name": "description", "type": 3, "description": "detail (optional)", "required": false }
] } ]
```

### 4.2 Apple Shortcut (one-tap home screen capture)
A Shortcut that:
1. Shows a menu of active projects + time commitment.
2. Optionally asks for a milestone line (skippable).
3. Fires `Get Contents of URL` POST to `/api/log` with a bearer secret in the header and a JSON body.

Server route validates the shared secret, resolves the project (exact match, same rule as Discord), and writes via the shared `log_entry` upsert — same path as the Discord bot. Put it behind a single-purpose secret, not your Supabase keys.

---

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Matches the existing portfolio; can be a logged-in section of aidanchien.com |
| Hosting | Vercel Hobby | Free, non-commercial personal use |
| DB + API + Auth | Supabase (Postgres) | Free tier covers this easily; RLS for safety |
| Auth | Supabase Auth, magic link | Single user; no password to manage |
| Styling | Tailwind | Fast; theme to the space aesthetic |
| Charts | Recharts or custom SVG | Heatmap is a custom SVG grid; bars via Recharts |
| Capture | Discord Interactions API + Apple Shortcuts | Free, webhook-driven |
| Keep-alive | GitHub Actions cron | Prevents Supabase free-tier pause |

### Free-tier watch-items
- Supabase free projects pause after 7 days of no DB activity, with a ~30s cold start on wake. A daily login likely prevents it, but add a GitHub Actions cron (twice weekly) that runs a trivial query to keep the timer reset. ~15 lines of YAML.
- Free tier caps that are irrelevant at this scale: 500 MB DB, 50k MAU, unlimited API requests. A year of daily entries is a few hundred rows.
- Use the service role key only server-side (API route), never in the browser. The browser uses the anon key + RLS.

---

## 6. Architecture

```
                 ┌────────────────┐
  Apple Shortcut │  POST /api/log │──┐
                 └────────────────┘  │
                                      ├──► Next.js API route (Vercel)
   Discord  ──► webhook  /api/discord ┘            │ (verifies signature, resolves project)
                                                   ▼
                                             Supabase Postgres
                                             (projects, entries) ◄── RLS
                                                   ▲
   Browser (Next.js app on Vercel) ──── anon key ──┘
   - heatmap, calendar, monthly breakdown, Throwbacks, quick add

   GitHub Actions cron ──► trivial query ──► keeps project awake
   Vercel Cron ──► /api/cron/digest ──► Discord channel webhook (daily Throwback)
```

---

## 7. Build phases

1. **Foundation.** Supabase project, schema, enum, RLS, seed the 5 starter projects. Verify with the SQL editor.
2. **Auth + project CRUD.** Magic-link login. List / create / edit / archive projects. Active-only picker component.
3. **Daily log core.** Quick-add form (project + time spent always visible, milestone optional, description tucked away), day detail view, the year heatmap.
4. **Monthly breakdown.** Days-worked stat, time-commitment split, per-project stacked bar.
5. **Throwbacks.** Date-seeded insights feed (one shared query/view) with relative-age labels; render on the dashboard.
6. **Discord capture.** `/api/discord` Next.js route, Ed25519 verification, the `/log` slash command, exact project resolution, writes via the shared `log_entry`, ephemeral confirm.
7. **Apple Shortcut.** `/api/log` route + the Shortcut. Share-sheet / home-screen tap.
8. **Polish + portfolio integration.** Theme to the space aesthetic, GitHub Actions keep-alive, optional public read-only "what I'm working on" page.

---

## 8. Stretch goals (post-v1)
- Streaks (consecutive days logged) and per-project momentum.
- Daily Discord digest: the day's Throwback posted each morning to a Discord channel webhook via a Vercel Cron job.
- CSV / JSON export and import (also a clean migration path out of the Notion prototype).
- A public, read-only "now" page driven by recent milestones and large-time-commitment entries, embedded in the portfolio.
- Project aliases table so Discord project matching is forgiving (`aim`, `ai-m`, `mental health` all map to one project).

---

## 9. Open questions
- **Resolved — one Entry per (project, day)**, upsert-accumulate (ADR-0001), enforced by a unique constraint; all capture paths write via `log_entry`.
- **Resolved — at most one milestone per Entry**, hence at most one per project per day. Different projects on the same day each carry their own.
- Do learning projects (Turkish, Mandarin) want a streak view specifically, separate from work projects?
