# Build plan — dependency-ordered roadmap

The decomposition of the PRD into buildable, mostly-parallel units. This is the **backlog**;
the lifecycle still runs through `tasks/todo/` → `tasks/done/` (see `tasks/README.md`). When you
pick up an item here, create its `tasks/todo/NNNN-slug.md` from `TEMPLATE.md`, link back to this
plan, and respect the `Blocked by` order. One owner per file — depend on a unit's *contract*
(`lib/types.ts` + the `lib/*.ts` signatures), never its internals.

> Binding invariants (see `docs/adr/`):
> - **ADR 0001** — one Entry per `(user_id, project_id, entry_date)`; all capture paths
>   **upsert-accumulate** via the single `upsertEntry` helper (`time_spent = greatest(old,new)`,
>   `milestone`/`description` = `coalesce(new,old)`). `time_size` enum stays ascending
>   `small,medium,large`.
> - **ADR 0002** — Discord + Apple + daily digest are **Next.js API routes** (digest via Vercel
>   Cron), sharing one TS lib. No Supabase Edge Functions; PRD §4.1 Deno sketch superseded.

## Wave 0 — Foundation (serial; gates everything)

- **F1 — App scaffold + Supabase clients.** Next.js 15 (App Router, TS) + Tailwind; browser
  (anon) + server (service-role, server-only) clients; env wiring + `.env.example`; npm scripts
  `dev/build/lint/typecheck/test`.
  Owns: `package.json`, `next.config.*`, `tsconfig.json`, `tailwind.config.*`, `app/layout.tsx`,
  `app/globals.css`, `lib/supabase/{client,server}.ts`, `.env.example`. Blocked by: —.
  Done: `build` + `typecheck` pass, `dev` serves, service-role never reaches a client component.
  → seeded as `tasks/todo/0003`.
- **F2 — Schema + migrations + RLS + seed.** `time_size` enum (ascending), `projects` + `entries`,
  `unique (user_id, project_id, entry_date)`, indexes (incl. partial milestone index), RLS, seed 5
  projects. Owns: `supabase/migrations/*.sql`, `supabase/seed.sql`, `supabase/config.toml`.
  Blocked by: — (parallel to F1). Done: migrations apply clean; cross-user `select` returns 0;
  unique constraint rejects a dup. → seeded as `tasks/todo/0004`.
- **F3 — Generated DB types.** Owns: `lib/database.types.ts`. Blocked by: F2.
  Done: committed, imports compile.

## Wave 0.5 — Contracts (serial; gate for all consumers)

- **C1 — Domain types + signatures + shared-helper contract.** Hand-written types and stubbed
  signatures every stream builds against. Owns: `lib/types.ts` (`TimeSize`, `Project`, `Entry`,
  `HeatmapCell`, `CalendarDay`, `AnniversaryItem`, `MonthlyStat`), `lib/queries.ts`
  (`getHeatmap`, `getCalendarMonth`, `getMonthlyBreakdown`, `getAnniversaries`,
  `getActiveProjects`), `lib/entries.ts` (`upsertEntry`), `lib/projects.ts` (`resolveProject`).
  Blocked by: F3. Done: `typecheck` passes with every signature stubbed.

## Wave 1 — Data + Auth (parallel)

- **A1 — Read queries (impl).** Heatmap weight rollup, per-day/per-project calendar rollup (order
  by weight), monthly breakdown, anniversary "on this day", active-project picker. Owns:
  `lib/queries.ts`. Blocked by: C1. Done: integration test vs seeded DB returns expected shapes.
- **A2 — Upsert-accumulate + project resolution (impl).** ADR-0001 `upsertEntry`; case-insensitive
  per-user project dedup. Owns: `lib/entries.ts`, `lib/projects.ts`. Blocked by: C1.
  Done: re-upsert keeps greater `time_spent`, never nulls existing milestone/description; name
  variant resolves to existing id (no dup row).
- **AUTH1 — Magic-link auth + protected layout.** Owns: `app/(auth)/**`, `middleware.ts`,
  `lib/supabase/middleware.ts`. Blocked by: F1. Done: unauth redirect to login; magic-link
  round-trip authenticates; session persists.

## Wave 2 — Web UI + capture (parallel; one owner per file)

> Dashboard rule: **B2 owns `app/(log)/page.tsx`** (shell); B4 ships a self-contained
> `<AnniversaryFeed/>` that B2 slots in.

- **B1 — Quick-add form.** Active-only project picker + inline "+ New project"; S/M/L segmented;
  optional milestone; description behind "+ add detail"; server action → `upsertEntry`. Owns:
  `components/quick-add/**`, `app/actions/entries.ts`. Blocked by: C1, A2. Done: create/update an
  Entry; inline new-project creates+selects; re-log accumulates.
- **B2 — Daily log: heatmap + calendar + day detail.** Custom-SVG year heatmap; month calendar
  with per-project color banners (order by weight, "+N" overflow); view toggle; cell-click → day
  detail hosting quick-add. Owns: `components/heatmap/**`, `components/calendar/**`,
  `app/(log)/page.tsx`, `app/(log)/layout.tsx`. Blocked by: C1, A1. Done: colors match per-day
  weight; banners match rollup; cell click opens the day.
- **B3 — Monthly breakdown.** Days-worked stat, time split, per-project stacked bar (Recharts).
  Owns: `components/monthly/**`, `app/(log)/monthly/page.tsx`. Blocked by: C1, A1.
  Done: numbers match `getMonthlyBreakdown()` for seeded month.
- **B4 — Anniversary feed.** `<AnniversaryFeed/>` "on this day" component. Owns:
  `components/anniversary/**`. Blocked by: C1, A1. Done: renders today's calendar-day matches from
  seed; clean empty state.
- **B5 — Project management.** List/create/edit/**archive** (not delete). Owns:
  `components/projects/**`, `app/(log)/projects/page.tsx`. Blocked by: C1, A2. Done: archive drops
  from picker but entries persist in monthly + anniversary views.
- **E1 — Discord `/log` route.** Next.js route: Ed25519 verify, PING→PONG, owner-id gate, typed
  `/log` → `upsertEntry`, ephemeral reply; + command-registration script. Owns:
  `app/api/discord/route.ts`, `scripts/register-discord-command.ts`. Blocked by: C1, A2.
  Done: bad sig → 401 (known-bad vector); PING → PONG; owner `/log` upserts; non-owner rejected.
- **G1 — Apple Shortcut ingest.** `POST /api/log`: bearer-secret validate, resolve project,
  `upsertEntry`. Owns: `app/api/log/route.ts`. Blocked by: C1, A2. Done: wrong secret → 401; valid
  POST upserts; shares the A2 path (no duplicated insert).

## Wave 3 — Ops + integration

- **D2 — Supabase keep-alive cron.** GitHub Actions, trivial query twice weekly. Owns:
  `.github/workflows/keepalive.yml`. Blocked by: F2. Done: workflow runs green.
- **D1 — Daily anniversary digest** *(deferrable to post-v1).* Vercel Cron (1/day) → Discord
  channel webhook; reuses `getAnniversaries()`. Owns: `app/api/cron/digest/route.ts`,
  `vercel.json`. Blocked by: A1. Done: route returns today's anniversaries and posts on trigger.
- **D3 — Deploy + domain.** Vercel project, env (anon + server-side service-role),
  `log.aidanchien.com`. Owns: `vercel.json`, `README.md`. Blocked by: AUTH1, B1, B2.
  Done: prod build deploys; magic-link login works live.

## Dependency graph

```
F1 ─┬─ AUTH1
    └─ (scaffold) ─┐
F2 ─┬─ F3 ─ C1 ────┼─ A1 ─┬─ B2,B3,B4 ─┐
    └─ D2          └─ A2 ─┼─ B1,B5      ├─ D3
                          ├─ E1,G1      │
                          └─ A1 ─ D1 ───┘
```

Critical path: **F1/F2 → F3 → C1 → A1/A2 → UI/capture → D3.** Everything after C1 fans out.
E1 and G1 share only the A2 write path with the web app — lowest conflict, safest to run on a
separate session/worktree.
