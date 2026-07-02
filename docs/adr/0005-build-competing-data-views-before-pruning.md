# 0005 - Build competing data views before pruning

- **Status:** accepted
- **Date:** 2026-07-02
- **Related:** PRD sections 3.1, 3.3, 7; task-0005

## Context

The product needs a strong visual language, but choosing between a compact contribution heatmap
and a detailed month calendar from prose alone would discard useful options too early. The same
entry data can also support informative charts whose value is easier to judge with real data than
from a static specification.

## Decision

The first implementation will build both the year heatmap and a Notion-inspired month calendar.
It will also include a small set of polished, data-supported visualization experiments. These
views remain separate, composable UI sections so the owner can evaluate them in the running
product and remove or retain each one without redesigning the data layer.

## Consequences

The first pass contains intentionally overlapping views and is an exploration rather than a final
dashboard hierarchy. Every visualization must use real entry data, handle sparse and empty states,
and remain accessible and responsive. Novelty alone is not sufficient: a chart must answer a
specific question, and visual experiments must not change the core schema merely to decorate the
interface. The owner will choose the final set after reviewing the implementation.
