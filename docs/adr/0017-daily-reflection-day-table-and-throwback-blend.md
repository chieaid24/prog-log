# 0017 - Daily reflection is a day-level table blended into the throwback pool

- **Status:** accepted
- **Date:** 2026-07-28
- **Related:** PRD #29 (daily reflection), ADR-0001 (entry is one per project per day), ADR-0006 (hand-maintained types)

## Context

An entry is grained one row per (user, project, day) (ADR-0001): a project, a date, a time
commitment, optionally a milestone or description. The owner wants to also capture the day itself -
one free-text line about what they were proud of or interested in that day. That is a property of the
day, not of any one project: on a day with three projects there is still exactly one reflection.

The throwback feed today draws only from entries whose milestone is non-null, humanizing each by age.
The owner wants reflections to resurface there too, so a throwback can say "a year ago you shipped X"
or "a year ago you were into Y" from one feed - and the same feed drives the daily Discord digest.

## Decision

We store the daily reflection in a new day-level table, one row per (user, day), rather than as a
column on entries or a synthetic project. A single upsert RPC (set_reflection, mirroring log_entry)
is the only write path: security-invoker so the browser writes under RLS, with service-role callers
passing the owner id explicitly. The table carries the same owner RLS policy and explicit grants as
the rest of the schema; types are hand-maintained (ADR-0006).

Throwbacks blend the two sources. The throwback pool query selects past reflections in addition to
milestone entries, and the throwback item gains a kind discriminator (milestone or reflection) with
project fields optional (a reflection has no project). The existing date-seeded deterministic pick
runs over the combined pool, so the on-page feed and the Discord digest stay in sync and a reflection
can be the day's digest item. The feed and digest render a reflection distinctly (no project accent).

## Consequences

- The day-level grain is honored exactly: one reflection per day regardless of how many projects were
  worked, with no null-column-on-every-entry and no fake "reflection project" polluting project
  views. The cost is a second table and a second write RPC, kept consistent with the entry path by
  mirroring log_entry's single-writer, upsert-accumulate shape.
- The throwback contract changes: ThrowbackItem is now a tagged union over milestone and reflection,
  and every consumer (the on-page feed, the digest) must handle both kinds. This is the deliberate
  point of the feature; the seeded-pick determinism and humanized-age labels are unchanged and reused.
- Reflections are optional, so the pool is milestones-heavy early on and grows as reflections
  accumulate - the same graceful-empty behavior the throwback feed already has applies.
- Rejected: a nullable reflection column on entries (wrong grain - which of the day's project rows
  holds it? - and it would duplicate or conflict across a day's entries); a synthetic per-user
  "reflection" project logged via the existing entry path (overloads milestone text, leaks a fake
  project into pickers and breakdowns); a separate reflection-only throwback feed (the owner asked for
  one blended story, and two feeds double the UI and the digest logic).
