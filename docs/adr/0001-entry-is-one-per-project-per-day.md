# Entry grain is one-per-(project, day), upsert-accumulate

An Entry represents how much a Project was worked on a given day, not an
individual work session. We enforce `unique (user_id, project_id, entry_date)`
and have all capture paths (web quick-add, Discord `/log`, Apple Shortcut) upsert
rather than insert. On conflict the row accumulates: `time_spent` takes the
`greatest()` of old and new, and `milestone`/`description` are `coalesce`-merged
so a quick re-log can never silently downgrade effort or erase a milestone.

We chose this over append-only "sessions" because the product question is "which
projects did I touch today and how hard," not "how many separate blocks" — and it
makes the calendar's one-banner-per-project and the heatmap's per-day weight fall
out naturally.

## Consequences
- `greatest()` on `time_spent` relies on the `time_size` enum being declared in
  ascending-effort order (`small, medium, large`). Reordering the enum silently
  breaks max selection.
- Truly logging two distinct sessions of the same project in one day is not
  representable; only the peak commitment survives.
