# PRD: Work Log & Project Tracker (Next.js + Supabase)

**Owner:** Aidan
**Status:** Draft, ready to build
**Goal:** A self-hosted daily work log that doubles as a portfolio project. Port the Notion prototype to a custom app with proper "on this day" anniversary logic, a contribution-style heatmap, and frictionless capture from Telegram and an Apple Shortcut. Must run entirely on free tiers.

---

## 1. Problem & goal

Track which projects got worked on each day (Work, AI-M, Website, Turkish, Mandarin, etc.) with near-zero logging friction. The core unit is simple: **a project, a date, and a rough time commitment.** Most days are just "general work" with no extra text. Occasionally a day carries a **milestone** (a short line describing something notable), and rarely a longer **description**. Then answer two questions well:

1. How did I spend my month? (days worked, time-commitment distribution, per-project breakdown)
2. What did I accomplish N months/years ago today? (anniversary feed of milestones)

The Notion version covers daily logging and a milestone list. This build exists to nail the anniversary feed, give a real heatmap, and be hosted at on Vercel at log.aidanchien.com.

### Design principle
The project is the thing being tracked. Milestone and description are both optional and most entries have neither. Logging a normal day should be: pick project, pick time commitment, done.

### Non-goals (v1)
- Multi-user / team features. Single user (you), though the schema is multi-user-safe via RLS.
- Exact hour tracking. Time is t-shirt-sized on purpose (Small / Medium / Large).

---

## 2. Core concepts (data model)

Two tables. Everything else is a query.

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
| milestone | text | **optional**, null on most days. When present, this entry is an anniversary item. This is the headline text. |
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
  milestone   text,         -- optional headline; non-null = anniversary item
  description text,         -- optional, deemphasized detail
  created_at  timestamptz not null default now()
);

create index entries_user_date_idx on entries (user_id, entry_date desc);
create index entries_project_idx   on entries (project_id);
create index entries_milestone_idx on entries (user_id, entry_date)
  where milestone is not null;   -- partial index for the anniversary feed
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

Clicking a cell opens that day's entries and a quick-add form.

#### 3.1.2 Calendar view (project color banners)
A month-grid view styled like Google Calendar. Each past day's cell shows one **color banner per distinct project worked that day**, using the project's `color`. Multiple projects in one day stack as multiple banners (cap the visible count, e.g. 3, then a "+N" overflow). This answers "what did I work on?" where the heatmap only answers "how much?".

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

### 3.4 Anniversaries / "on this day" (the headline feature)
Surface milestones that fall on today's calendar day in prior months/years. A milestone is simply a non-null `milestone`.

Exact "this day in history":

```sql
select e.milestone, e.entry_date, p.name as project_name,
  (current_date - e.entry_date) as days_ago
from entries e
join projects p on p.id = e.project_id
where e.user_id = auth.uid()
  and e.milestone is not null
  and extract(month from e.entry_date) = extract(month from current_date)
  and extract(day   from e.entry_date) = extract(day   from current_date)
  and e.entry_date < current_date
order by e.entry_date desc;
```

"Round number" anniversaries (exactly 1, 3, 6, 12 months ago today), nicer for a daily digest:

```sql
select e.milestone, e.entry_date, p.name as project_name
from entries e
join projects p on p.id = e.project_id
where e.user_id = auth.uid()
  and e.milestone is not null
  and e.entry_date = any (array[
        current_date - interval '1 month',
        current_date - interval '3 months',
        current_date - interval '6 months',
        current_date - interval '1 year'
      ]::date[])
order by e.entry_date desc;
```

Wrap whichever version you pick in a Postgres view or a Supabase Edge Function so the frontend and the Telegram digest share one source of truth.

### 3.5 Archive (not delete)
Toggling a project to `archived` removes it from the quick-add picker but keeps every entry. Old projects still appear in monthly breakdowns and anniversaries. Hard delete only via an explicit admin action.

---

## 4. Capture layer (zero-friction logging)

### 4.1 Telegram bot (primary mobile capture)
Webhook style, not polling, so nothing runs 24/7 and it stays free.

- **Where it runs:** a Supabase Edge Function (or a Next.js API route at `/api/telegram`). Telegram POSTs each message to that URL.
- **Auth:** restrict to your own Telegram user id; ignore everything else. Set a webhook secret token and verify the `X-Telegram-Bot-Api-Secret-Token` header.
- **Input formats:**
  - Normal day: `project | time`  e.g. `work | m`
  - With a milestone: prefix the text with `*` or `!`  e.g. `aim | m | * got RAG retrieval working end to end`
  - With a description (non-milestone detail): plain text after the time  e.g. `work | l | spent the day on terraform drift`
  - Time accepts s/m/l or small/medium/large. Project matched case-insensitively against active project names (fuzzy-match or alias table).
- **v2, friendlier:** bot replies to a bare message with an inline keyboard of active projects, then time buttons, then asks "milestone? (optional)". More taps, zero memorization.

Edge Function sketch (Deno):

```ts
// supabase/functions/telegram/index.ts
import { createClient } from "jsr:@supabase/supabase-js";

Deno.serve(async (req) => {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== Deno.env.get("TG_SECRET"))
    return new Response("forbidden", { status: 403 });

  const update = await req.json();
  const msg = update.message;
  if (!msg || msg.from.id !== Number(Deno.env.get("TG_USER_ID")))
    return new Response("ok"); // ignore

  const [projRaw, timeRaw, ...rest] = msg.text.split("|").map((s: string) => s.trim());
  const text = rest.join("|").trim();
  const isMilestone = /^[*!]/.test(text);
  const cleanText = text.replace(/^[*!]\s*/, "");
  const time_spent = { s: "small", m: "medium", l: "large" }[timeRaw?.[0]?.toLowerCase()] ?? "medium";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // service role, server-side only
  );

  const { data: project } = await supabase
    .from("projects").select("id")
    .eq("user_id", Deno.env.get("OWNER_USER_ID"))
    .ilike("name", `%${projRaw}%`).eq("status", "active").single();

  await supabase.from("entries").insert({
    user_id: Deno.env.get("OWNER_USER_ID"),
    project_id: project?.id,
    time_spent,
    milestone:   isMilestone && cleanText ? cleanText : null,
    description: !isMilestone && cleanText ? cleanText : null,
  });

  // reply via Telegram sendMessage API for confirmation
  return new Response("ok");
});
```

Register the webhook once:
`https://api.telegram.org/bot<TOKEN>/setWebhook?url=<FN_URL>&secret_token=<TG_SECRET>`

### 4.2 Apple Shortcut (one-tap home screen capture)
A Shortcut that:
1. Shows a menu of active projects + time commitment.
2. Optionally asks for a milestone line (skippable).
3. Fires `Get Contents of URL` POST to `/api/log` with a bearer secret in the header and a JSON body.

Server route validates the shared secret, resolves the project, inserts the row. Same insert path as Telegram. Put it behind a single-purpose secret, not your Supabase keys.

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
| Capture | Telegram Bot API + Apple Shortcuts | Free, webhook-driven |
| Keep-alive | GitHub Actions cron | Prevents Supabase free-tier pause |

### Free-tier watch-items
- Supabase free projects pause after 7 days of no DB activity, with a ~30s cold start on wake. A daily login likely prevents it, but add a GitHub Actions cron (twice weekly) that runs a trivial query to keep the timer reset. ~15 lines of YAML.
- Free tier caps that are irrelevant at this scale: 500 MB DB, 50k MAU, unlimited API requests. A year of daily entries is a few hundred rows.
- Use the service role key only server-side (Edge Function / API route), never in the browser. The browser uses the anon key + RLS.

---

## 6. Architecture

```
                 ┌────────────────┐
  Apple Shortcut │  POST /api/log │──┐
                 └────────────────┘  │
                                      ├──► Next.js API route / Supabase Edge Function
   Telegram ──► webhook /api/telegram ┘            │ (validates secret, resolves project)
                                                   ▼
                                             Supabase Postgres
                                             (projects, entries) ◄── RLS
                                                   ▲
   Browser (Next.js app on Vercel) ──── anon key ──┘
   - heatmap, monthly breakdown, anniversaries, quick add

   GitHub Actions cron ──► trivial query ──► keeps project awake
```

---

## 7. Build phases

1. **Foundation.** Supabase project, schema, enum, RLS, seed the 5 starter projects. Verify with the SQL editor.
2. **Auth + project CRUD.** Magic-link login. List / create / edit / archive projects. Active-only picker component.
3. **Daily log core.** Quick-add form (project + time spent always visible, milestone optional, description tucked away), day detail view, the year heatmap.
4. **Monthly breakdown.** Days-worked stat, time-commitment split, per-project stacked bar.
5. **Anniversaries.** "On this day" feed as a Postgres view or Edge Function; render on the dashboard.
6. **Telegram capture.** Edge Function webhook, secret validation, the `|` parse with `*`/`!` milestone marker, confirmation reply.
7. **Apple Shortcut.** `/api/log` route + the Shortcut. Share-sheet / home-screen tap.
8. **Polish + portfolio integration.** Theme to the space aesthetic, GitHub Actions keep-alive, optional public read-only "what I'm working on" page.

---

## 8. Stretch goals (post-v1)
- Streaks (consecutive days logged) and per-project momentum.
- Daily Telegram digest: today's anniversaries pushed each morning via a scheduled Edge Function.
- CSV / JSON export and import (also a clean migration path out of the Notion prototype).
- A public, read-only "now" page driven by recent milestones and large-time-commitment entries, embedded in the portfolio.
- Project aliases table so Telegram matching is forgiving (`aim`, `ai-m`, `mental health` all map to one project).

---

## 9. Open questions
- One entry per project per day, or allow multiple sessions per project per day? (Schema already allows multiple; decide the UI default.)
- Should a day support multiple milestones, or at most one per entry? (Currently one milestone per entry, multiple entries per day allowed.)
- Do learning projects (Turkish, Mandarin) want a streak view specifically, separate from work projects?
