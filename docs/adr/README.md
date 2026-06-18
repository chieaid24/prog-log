# Architecture Decision Records (ADRs)

This is the project's decision log. **Every non-trivial design choice gets an ADR** so that a
future agent (or human) can see not just *what* the code does but *why* it is that way — and can
safely revisit a decision instead of re-deriving it from scratch.

## When to write one

Write an ADR when you:

- pick a library, pattern, schema shape, or boundary that constrains future work,
- diverge from the PRD or resolve one of its open questions,
- make a trade-off that a reasonable reviewer might question later.

Skip it for trivial, obvious, or easily-reversed changes (a copy edit, a rename).

## How

1. Copy `TEMPLATE.md` to `NNNN-short-slug.md` (zero-padded, next number).
2. Fill in Context → Decision → Consequences. Keep it short; one decision per file.
3. Set **Status** to `accepted` (or `proposed` if it needs review).
4. Link it from the task that produced it, and reference the PRD section it touches.
5. ADRs are immutable once accepted. To change a decision, write a **new** ADR with
   status `supersedes ADR-NNNN`, and set the old one's status to `superseded by ADR-MMMM`.

## Next number

```bash
ls docs/adr | grep -oE '^[0-9]{4}' | sort -n | tail -1
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-adopt-autonomous-agent-workflow.md) | Adopt an autonomous agent workflow | accepted |
