# 0009 — Public "now" page reads via the service role, publishing an explicit field list

- **Status:** accepted
- **Date:** 2026-07-03
- **Related:** PRD §8 (public "now" page stretch), PRD §7 phase 8, task-0016

## Context

The "now" page is the app's one public surface: a read-only, portfolio-embeddable view of
recent Milestones and large-Time-Commitment Entries. Every other read in the app runs as the
signed-in user under RLS (anon key + session). A signed-out visitor has no session, and the
RLS policies are strictly per-owner — so the anon key can read nothing. Something server-side
has to fetch on the visitor's behalf, and that something decides exactly how much of a private
work journal becomes public.

## Decision

`app/now/page.tsx` fetches with the service-role admin client (`lib/supabase/admin.ts`,
`server-only`), filtered to `user_id = OWNER_USER_ID` — the same env identity the capture
routes write as. The query selects an **explicit publication field list** and nothing more:
Project `name`, `category`, `color`; Entry `entry_date`, `time_spent`, `milestone`.
`description` is never selected — Descriptions are private journal detail (PRD §3.1), and the
safest way to not leak a column is to never fetch it. The window is the last 60 days; only
Entries that carry a Milestone or a `large` Time Commitment qualify (PRD §8's definition of
"now").

The page is static-regenerated (`export const revalidate = 3600`), not `force-dynamic`: one
service-role query per hour per deploy, effectively free on the Vercel Hobby + Supabase free
tiers, and a public page that cannot become a database-load amplifier.

If `OWNER_USER_ID` is unset or nothing qualifies in the window, the page renders a quiet
"building quietly" state — never an error — so a fresh deploy without env vars still serves a
presentable public page.

## Consequences

- The service role is used for a public, *unauthenticated* render path. The blast radius is
  bounded by the explicit select list and the fixed owner filter: no request input reaches
  the query (no params, no cookies, no headers), so there is nothing for a visitor to
  manipulate. Adding any new field to the public payload is a deliberate code change to that
  select list — reviewable, greppable.
- ISR means the page can lag reality by up to an hour. Acceptable: "now" is a
  weeks-granularity concept; in exchange the page adds zero per-visit load.
- Rejected: a public-read RLS policy on a view or flagged columns (moves the privacy boundary
  into SQL where it silently applies to *every* anon query, and a policy mistake exposes the
  whole table — the narrow select list in one file is easier to audit); a separate
  `public_now` materialized table maintained by triggers (real infrastructure for one page);
  client-side fetch with a published token (no such thing as a safe browser-held secret).
