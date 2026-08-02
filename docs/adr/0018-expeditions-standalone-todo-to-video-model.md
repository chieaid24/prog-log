# 0018 - Expeditions are a standalone todo-to-video table with single-writer RPCs

- **Status:** accepted
- **Date:** 2026-08-02
- **Related:** PRD #55 (expeditions), ADR-0001 (entry is one per project per day), ADR-0017 (daily reflection day table), ADR-0006 (hand-maintained types), ADR-0012 (explicit table grants)

## Context

The owner wants a new surface, separate from Entries and Reflections, to track topics or questions
generated through the week and answer one each week by recording a YouTube explainer. The items live
in a todoist-style list: a top todo section that is hand-orderable by drag (new items append to the
bottom), and a lower showcase of answered items linking to their videos. These items are not tied to
a Project (unlike an Entry) and are not day-grained (unlike a Reflection): an item is created once,
sits open until answered, and then persists as an answered artifact. Capture must work from the web
and from a Discord `/expedition` command, matching the web/Discord capture parity the repo already
holds for `/log` and `/reflect`.

## Decision

We store Expeditions in a new standalone `expeditions` table, one row per item: a required one-line
`title`, an optional short `description`, a `status` enum (`open` | `answered`), an integer
`position` for manual todo ordering, the answer fields (`youtube_url`, `youtube_video_id`,
`youtube_title`, nullable), an `answered_at` timestamp, and created/updated timestamps. No Project
foreign key - Expeditions are deliberately flat. Owner RLS policy and explicit grants match the rest
of the schema (ADR-0012); types are hand-maintained (ADR-0006).

Writes funnel through a small set of security-invoker RPCs - the single write surface, mirroring
`log_entry` (ADR-0001) and `set_reflection` (ADR-0017): `add_expedition`, `reorder_expeditions`,
`answer_expedition`, `reopen_expedition`, `update_expedition`, `delete_expedition`. The browser calls
them under RLS as `auth.uid()`; Discord capture calls `add_expedition` service-role with the owner id,
so both paths share one insert. New items insert at `max(position) + 1` (bottom). Reorder rewrites
positions from an ordered id array - an integer reindex of the open set, fine at single-user list
sizes. Answering requires a non-empty YouTube URL (link-required, per the owner) and sets
`answered_at`; reopen flips status back to `open` and moves the row to the bottom of the todo list,
retaining the stored link. Open items read ordered by `position` ascending; answered items by
`answered_at` descending.

Drag reordering uses `@dnd-kit/sortable` - the first client-side drag dependency in the app - for
accessible pointer and keyboard reordering, chosen over a hand-rolled HTML5 drag surface.

## Consequences

- One consistent capture pattern: the web and Discord paths cannot diverge because both insert
  through `add_expedition`, exactly as entries and reflections do. Manual ordering persists across
  sessions, and the open/answered split is a single status flip.
- The cost is a fourth table plus a cluster of RPCs, and an integer reindex that rewrites the open set
  on each reorder. At single-user list sizes this is negligible; a fractional or lexical rank would
  avoid the rewrite but adds ordering complexity for no felt benefit here.
- Adding `@dnd-kit` is a new dependency and bundle cost, accepted for accessible, robust reordering
  over a fragile bespoke implementation.
- Rejected: a boolean `done` column instead of a `status` enum (the enum reads clearer and leaves
  room to grow); tying an Expedition to a Project (the owner wants a flat, standalone list, and a FK
  would leak Expeditions into project pickers and breakdowns); fractional/lexical ranks (unneeded at
  this scale); writing the table directly from server actions (forks the web and Discord paths and
  breaks the single-writer parity the repo standardizes on).
