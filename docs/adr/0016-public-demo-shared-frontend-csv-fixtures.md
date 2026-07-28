# 0016 - Public demo runs the shared frontend against server-side CSV fixtures

- **Status:** accepted
- **Date:** 2026-07-28
- **Related:** PRD #28 (private single-user app + public read-only demo), ADR-0009 (public "now" page)

## Context

The app is the owner's private work journal, but it is also meant to be a portfolio piece people can
click through. Those pull in opposite directions: a public showcase must never expose real entries,
and a genuinely private app cannot just be handed out as a link. ADR-0009 already carved out one
narrow public surface (the "now" page) by fetching a fixed, explicit field list as the owner via the
service role. A full demo is different in kind: it needs every view populated - heatmap, calendar,
monthly breakdown, throwbacks, reflections - and the capture forms visible and clickable, all without
a single real row leaving the database.

We want one frontend, not a forked "demo UI" that drifts from the real app. The reads already flow
through server components hitting a thin query layer, so there is a single seam where the data source
can be swapped.

## Decision

We run the public demo as the same codebase deployed a second time with a DEMO_MODE flag, serving
fabricated data from a server-side CSV fixture. Concretely:

- A DEMO_MODE environment flag switches the server-side read layer from Supabase to a fixture
  provider that parses checked-in CSV files (projects, entries, reflections) into the same domain
  shapes the queries already return. The CSV is read on the server and never enters the browser
  bundle.
- In DEMO_MODE the middleware treats all paths as public and seeds a demo owner/session so pages
  render without login. Every write path (server actions and capture routes) becomes a no-op that
  returns a "demo, not saved" sentinel; the client surfaces a small unobtrusive note when a write is
  attempted. The UI stays fully interactive - forms open, view toggles and month navigation work -
  it just never persists.
- The demo is deployed as a separate Vercel project built from this repo with DEMO_MODE=1 on its own
  domain. The private deployment stays owner-locked. No public surface ever points at the real
  database.

## Consequences

- One frontend serves both the private app and the demo, so the showcase cannot drift from the real
  product. The cost is a data-source seam and a DEMO_MODE branch that every write path must honor -
  reviewable because it is one flag checked in a small number of places.
- The demo has no database, nothing to keep awake, and no abuse surface: it is static fixtures plus a
  no-op write layer, effectively free and always-on. A visitor cannot reach the real DB because the
  demo build has no real credentials and every read is routed to the fixture provider.
- Because writes are no-ops, the demo cannot show a just-created row persisting across a reload. That
  is an accepted limitation of a read-only tour; the forms still demonstrate the flow.
- Rejected: a second Supabase project seeded with demo rows (another free-tier project to seed, keep
  awake, and guard against writes, and a real DB behind a public URL); baking fixtures into the
  client bundle (ships demo data to every visitor of the real app and couples the UI to a data blob);
  productionizing the e2e mock-supabase server as the demo backend (it is e2e-shaped - port-based,
  read-only via 405s - and would need real hosting for one page's worth of value).
- The demo fixture should include reflections once that read path exists (PRD #29), modeled as a soft
  cross-PRD dependency so the demo tour can showcase them.
