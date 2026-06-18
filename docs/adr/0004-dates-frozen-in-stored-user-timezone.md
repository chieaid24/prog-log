# 0004 — Dates are computed in a stored user timezone and frozen at capture

- **Status:** accepted
- **Date:** 2026-06-17
- **Related:** PRD §3.1 (heatmap/calendar), §3.4 (Throwbacks), §4 (capture); ADR-0002

## Context

The app is date-centric: `entry_date` defaults, heatmap day grouping, Throwback
age math, and the daily digest all depend on what "today" means. Postgres
`current_date` is UTC, so for an Eastern-time user an evening log rolls onto the
next day and a "morning" digest fires the previous evening. The user is single-user
and may occasionally change location, and asked for timezone switching.

## Decision

Store a single per-user timezone (IANA name, default `America/Toronto`), changed
manually in settings — not auto-detected, not UTC. Every "today" boundary is
computed in that zone (e.g. `(now() at time zone <tz>)::date`, never bare
`current_date`). `entry_date` is a `DATE` equal to the calendar day in the user's
zone at capture and is never recomputed; changing the zone later affects only
future calculations, not historical entries.

We rejected UTC (wrong day for evening logs; mistimed digest) and live/auto
switching (the Discord and cron paths have no device context, and Vercel Hobby's
static daily cron cannot chase a moving zone).

## Consequences

- The daily digest fires at a fixed hour in the stored zone; while traveling it does
  not follow live location until the setting is changed.
- All capture endpoints and date queries must explicitly use the stored zone.
- Historical entries are immune to later timezone changes — a deliberate "freeze."
