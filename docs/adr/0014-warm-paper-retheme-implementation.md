# 0014 — Warm-paper retheme: token vocabulary, heat ramp, palette migration

- **Status:** accepted
- **Date:** 2026-07-06
- **Related:** DESIGN.md, PRODUCT.md, issue #10

## Context

DESIGN.md pinned the target system (warm paper, one frog-green accent, Hanken Grotesk +
Geist Mono, the heat-0..3 ramp, Ferdy the pixel frog) while the shipped app still wore the
original dark "space" theme: cold dark tokens named `background/panel/line/accent`, a
starfield, an indigo 5-step heatmap scale, and a neon "space" project palette picked for a
dark canvas. Implementing the redesign forced four decisions that DESIGN.md itself does not
settle.

## Decision

1. **Rename the semantic token vocabulary to DESIGN.md's names** instead of re-pointing the
   old names at new values: `paper/surface/surface-sunken/ink/ink-muted/ink-faint/border/
   border-strong/frog-green(-strong,-soft)/on-green/log-brown/warning-amber/danger-red/
   heat-0..3`. Tailwind classes read `bg-surface`, `text-ink`, `border-border`, etc., so the
   design system and the code speak one language; a conformance test bans the legacy names.
2. **Success is frog green.** The separate `success` token is deleted; affirmative states use
   `frog-green-strong` text, per DESIGN.md's "success reuses frog green".
3. **The heatmap collapses from 5 intensity buckets to the 4-step heat ramp.**
   `intensityLevel` now maps summed day weight 0 → heat-0, 1-2 → heat-1, 3-5 → heat-2,
   6+ → heat-3. The S/M/L chart ramp (`TIME_RAMP`) reuses heat-1..3, so every effort visual
   climbs the same green. Chart chrome consts became CSS-var references, so charts recolor
   with the theme.
4. **The project palette is replaced, and stored colors are migrated.** Ten muted
   warm-legible hues (oklch L 0.60-0.70, C 0.09-0.13, skipping the frog-green band ~130-170)
   replace the space set. Migration `20260706000001_warm_palette.sql` remaps each old palette
   hex to its nearest new hue (bijective, hue shift <= ~40deg), leaving user-custom hexes
   untouched. It must be applied to the production database on deploy.

## Consequences

- Easier: any agent can grep a DESIGN.md token name and find its uses; charts, heatmap and
  buttons stay in lockstep on retints because they share vars.
- Harder: the heatmap now distinguishes fewer intensity grades; a 4-weight day and a 5-weight
  day read the same (accepted: the ramp's legibility beats granularity, per DESIGN.md).
- Old palette hexes may still exist in exports created before the migration; import keeps
  them as custom colors, which is acceptable (identity is dot + name, never color alone).
- Rejected: keeping old token names with new values (perpetuates a second vocabulary);
  a 5th ramp step (diverges from the committed heat ramp); leaving stored colors in place
  (neon-on-paper fails the Warm Neutral Rule on every chip).
