# Work Log & Project Tracker

A single-user daily work log: track which Projects got worked on each day, at a
rough time commitment, with optional milestones. Doubles as a portfolio app.

## Language

**Project**:
The thing being tracked and logged against (e.g. Work, AI-M, Turkish). Has a
category, a color, and an active/archived status. Archived (never deleted) to
preserve history.
_Avoid_: task, activity

**Entry**:
A record that a given Project was worked on a given day, at one Time Commitment.
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

**Throwback**:
A past Milestone resurfaced in the feed with a human relative-age label
("3 months ago", "2 years ago"). Selection is intentionally loose and varied — a
discovery/insights feel, not a strict same-date rule. Only Entries that carry a
Milestone are eligible.
_Avoid_: anniversary, on this day, memory, insight
