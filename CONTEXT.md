# Work Log & Project Tracker

A single-user daily work log: track which Projects got worked on each day, at a
rough time commitment, with optional milestones. Doubles as a portfolio app.

## Language

**Project**:
The thing being tracked and logged against (e.g. Work, AI-M, Turkish). Has a
category, a color (auto-assigned from a palette at create, overridable, never
null), and an active/archived status. Archive preserves history and stays the
default removal path; an archived Project can be permanently deleted with all
of its Entries and aliases.
_Avoid_: task, activity

**Entry**:
A record that a given Project was worked on a given day, at one Time Commitment.
Its day is the calendar date in the user's timezone at capture, and is frozen.
Exactly one Entry per (Project, day) — re-logging the same Project/day updates
that Entry rather than creating a second one. Re-logging accumulates: it keeps
the peak Time Commitment and never erases an existing Milestone or Description.
_Avoid_: log, session, record

**Time Commitment**:
A t-shirt-sized measure of effort on an Entry: Small (<1h) / Medium (1–3h) /
Large (3h+). Maps to weight 1 / 2 / 3 for heatmap intensity. Deliberately not
exact hours.
_Avoid_: duration, hours, time spent

**Milestone**:
An optional one-line headline on an Entry marking something notable. Its presence
(non-null) is what makes the Entry eligible to resurface as a Throwback. Most
Entries have none.
_Avoid_: breakthrough, achievement, highlight

**Description**:
An optional, deemphasized longer "what I actually did" note on an Entry. Rarely
filled. Distinct from a Milestone — a Description is not surfaced as an Anniversary.
_Avoid_: notes, detail

**Reflection**:
A single free-text sentence about the day as a whole — one per day, day-level
rather than tied to any Project or Entry (ADR-0017; sole write path
`set_reflection`). Blended with Milestones into the Throwback pool, and, like a
Milestone, its presence makes a day appear on the Progress timeline.
_Avoid_: journal, note, diary, summary

**Throwback**:
A past Milestone resurfaced in the feed with a human relative-age label
("3 months ago", "2 years ago"). Selection is intentionally loose and varied — a
discovery/insights feel, not a strict same-date rule. Only Entries that carry a
Milestone are eligible.
_Avoid_: anniversary, on this day, memory, insight

**Expedition**:
A topic or question the owner generates through the week to later explain on
video, tracked in a todoist-style todo list. Standalone — never tied to a Project.
Has a one-line title and an optional short Description. Starts **open** in the
hand-ordered todo list (new ones append to the bottom; drag to reorder); becomes
**answered** when a YouTube video explaining it is attached — the link is required
to answer, and answering is reversible (reopen sends it back to the bottom of the
todo list). Answered Expeditions show most-recent-first with the video's title and
a small thumbnail.
_Avoid_: task, todo, question, topic, quest

**Progress**:
The deliberate all-time browse of the qualitative record at `/progress`
(ADR-0023): a reverse-chronological timeline of days carrying a Reflection or
Milestones, topped with streaks and a cumulative-effort curve, with the month's
analytics retained below. Replaces the old Monthly view (`/monthly` redirects).
Throwback stays the serendipitous resurface; Progress is the deliberate one.
_Avoid_: monthly view, history, feed
