# 0021 - Archived Projects can be permanently deleted

- **Status:** accepted
- **Date:** 2026-08-03
- **Related:** PRD 3.5, issue #52

## Context

The Project glossary, PRD 3.5, and `/projects` copy treated archive as the only removal path so
that every Entry remained in history. That rule also kept Projects created by mistake or no longer
worth retaining. The schema already cascades a Project delete to its Entries and aliases, while
day-level Reflections have no Project foreign key.

## Decision

We allow the owner to permanently delete an archived Project. The active row exposes Edit and
Archive; the archived row exposes Restore and Delete. Delete opens one confirmation that names the
Project, gives its exact Entry count, and states that the action cannot be undone. The write checks
that the Project is archived and relies on row level security to scope deletion to the owner.

## Consequences

- Archive remains the default, reversible way to remove a Project from capture pickers while
  preserving its history.
- Delete irreversibly removes the Project, its Entries, and its aliases. Derived views recompute
  from the remaining Entries. Day-level Reflections survive.
- The existing cascade constraints and grants already implement the data behavior, so this change
  needs no migration.
- We rejected delete-empty-only because it cannot remove unwanted history, and soft delete because
  archive already provides the non-destructive state.
