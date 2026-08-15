# Architecture Decision Records (ADRs)

This is the project's decision log. **Every non-trivial design choice gets an ADR** so that a
future agent (or human) can see not just *what* the code does but *why* it is that way — and can
safely revisit a decision instead of re-deriving it from scratch.

## When to write one

Write an ADR when you:

- pick a library, pattern, schema shape, or boundary that constrains future work,
- diverge from the PRD or resolve one of its open questions,
- make a trade-off that a reasonable reviewer might question later.

Skip it for trivial, obvious, or easily-reversed changes (a copy edit, a rename).

## How

1. Copy `TEMPLATE.md` to `NNNN-short-slug.md` (zero-padded, next number).
2. Fill in Context → Decision → Consequences. Keep it short; one decision per file.
3. Set **Status** to `accepted` (or `proposed` if it needs review).
4. Link it from the Issue/PR that produced it, and reference the PRD section it touches.
5. ADRs are immutable once accepted. To change a decision, write a **new** ADR with
   status `supersedes ADR-NNNN`, and set the old one's status to `superseded by ADR-MMMM`.

## Next number

```bash
ls docs/adr | grep -oE '^[0-9]{4}' | sort -n | tail -1
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-entry-is-one-per-project-per-day.md) | Entry grain is one-per-(project, day), upsert-accumulate | accepted |
| [0002](0002-capture-runs-in-nextjs-api-routes.md) | Capture & digest run in Next.js API routes | accepted |
| [0003](0003-adopt-autonomous-agent-workflow.md) | Adopt an autonomous agent workflow | superseded by [ADR-0013](0013-track-work-in-github-issues.md) |
| [0004](0004-dates-frozen-in-stored-user-timezone.md) | Dates computed in a stored user timezone, frozen at capture | accepted |
| [0005](0005-build-competing-data-views-before-pruning.md) | Build competing data views before pruning | accepted |
| [0006](0006-schema-verified-against-embedded-postgres.md) | Schema verified against embedded Postgres, not the Docker Supabase stack | accepted |
| [0007](0007-rollups-in-typescript-not-sql-views.md) | Rollups computed in TypeScript lib functions, not SQL views | accepted |
| [0008](0008-import-goes-through-the-shared-write-path.md) | Import goes through the shared write path, row by row | accepted |
| [0009](0009-public-now-page-reads-via-service-role.md) | Public "now" page reads via the service role, publishing an explicit field list | accepted |
| [0010](0010-project-aliases-table.md) | Project aliases live in their own table and resolve like names | accepted |
| [0011](0011-streaks-integrate-into-existing-views.md) | Streaks integrate into existing views; no separate streak view | accepted |
| [0012](0012-explicit-table-grants-in-migrations.md) | Table privileges are granted explicitly in migrations | accepted |
| [0013](0013-track-work-in-github-issues.md) | Track work in GitHub Issues; retire the `tasks/` folder | accepted |
| [0014](0014-warm-paper-retheme-implementation.md) | Warm-paper retheme: token vocabulary, heat ramp, palette migration | accepted |
| [0015](0015-mobile-navigation-and-aa-contrast.md) | Bottom tab bar, sheet capture, and AA-driven green/ink adjustments | accepted |
| [0016](0016-public-demo-shared-frontend-csv-fixtures.md) | Public demo runs the shared frontend against server-side CSV fixtures | accepted |
| [0017](0017-daily-reflection-day-table-and-throwback-blend.md) | Daily reflection is a day-level table blended into the throwback pool | accepted |
| [0018](0018-expeditions-standalone-todo-to-video-model.md) | Expeditions are a standalone todo-to-video table with single-writer RPCs | accepted |
| [0019](0019-youtube-metadata-via-oembed.md) | Resolve a YouTube title and thumbnail via oEmbed at answer time | accepted |
| [0020](0020-projects-page-all-time-analytics-home.md) | The Projects page is the all-time analytics home | accepted |
| [0021](0021-archived-project-hard-delete.md) | Archived Projects can be permanently deleted | accepted |
| [0022](0022-read-only-fit-to-width-year-heatmap.md) | Make the year heatmap read-only and fit to width | accepted |
| [0023](0023-progress-timeline-replaces-monthly-view.md) | The monthly view becomes the Progress timeline | accepted |
| [0024](0024-app-side-vercel-cron-keepalive.md) | Supabase keep-alive runs as an app-side Vercel Cron | accepted |
