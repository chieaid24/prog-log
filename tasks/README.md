# Tasks

Every unit of work flows through this directory. **No work starts without a task file here.**
This is a hard rule (see `/CLAUDE.md`) so that any agent — or a human — can look at this
folder and know exactly what is in flight, what is done, and why.

## Lifecycle

```
tasks/todo/   →   (work happens, commits reference the task)   →   tasks/done/
```

1. **Before starting work**, create a task file in `tasks/todo/` from `TEMPLATE.md`.
   Name it `NNNN-short-slug.md` (zero-padded, monotonically increasing).
2. **While working**, keep the checklist in the task file current. Commit continuously;
   reference the task id in commit bodies (e.g. `task: 0007`).
3. **When finished**, check every box, fill in the **Outcome** and **Verification** sections,
   then `git mv` the file to `tasks/done/`. A task is only "done" once it is moved
   *and* its verification evidence is recorded.

## Rules

- One task = one coherent unit of work (a build phase, a feature, a fix). Split large efforts.
- A task is not done until verification passed and the evidence is written into the file.
- If a task is abandoned, move it to `tasks/done/` anyway with an **Outcome: abandoned** note
  explaining why. Never silently delete a task.
- Link the relevant ADR(s) from the task, and vice-versa.

## Numbering

Find the next id:

```bash
ls tasks/todo tasks/done | grep -oE '^[0-9]{4}' | sort -n | tail -1
```
