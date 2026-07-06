# 0015 — Bottom tab bar, sheet capture, and AA-driven green/ink adjustments

- **Status:** accepted
- **Date:** 2026-07-06
- **Related:** PRD §3, issue #11, DESIGN.md (Navigation, Colors), ADR-0014

## Context

Issue #11 makes the shipped app a first-class mobile experience and raises it to WCAG 2.1 AA.
The app was desktop-first: a horizontal text nav that cramps below ~400px, a `max-w-6xl` shell
whose grids never reflowed (515px of horizontal overflow on the daily log at 360px), no
viewport/manifest metadata, and quick-add living in a desktop aside. An axe audit also found
two systemic AA contrast failures in the shipped palette: `on-green` button text on
`frog-green` (3.35:1 < 4.5:1) and `ink-faint` used for readable text (2.66:1). The issue's
hard constraints: conform to DESIGN.md, no new colors, no behavior/data changes, capture
stays two taps.

## Decision

- **Navigation collapses to a bottom tab bar below `md`** (user-selected over a hamburger
  sheet): four labelled tabs with 8-bit pixel icons in Ferdy's visual language, >=56px targets
  plus `env(safe-area-inset-bottom)`, active tab in ink with a green bar (never green alone).
  Desktop keeps the quiet top nav unchanged.
- **Mobile capture is a floating green pixel-plus button opening the quick-add form as a
  native `<dialog>` bottom sheet** (user-selected over an inline top-of-page form). The
  `<dialog>` gives focus trap, Escape, and top layer for free; slide-up is a 250ms
  `@starting-style` transform governed by `prefers-reduced-motion`. Same `QuickAddForm`,
  zero behavior change.
- **The green pair darkens one step for AA**: `--frog-green` `oklch(0.62 0.13 148)` →
  `oklch(0.54 0.13 148)` (on-green text 4.64:1), `--frog-green-strong` → `oklch(0.47 0.125 148)`
  (6.27:1; also fixes green-on-soft 3.95 → 5.33). Existing token *roles* and all component
  classes are unchanged; this is a value change inside the One Green Rule, not a new color.
- **`ink-faint` is demoted to placeholders and disabled text only.** Every readable word or
  number moves to `ink-muted` (5.08:1). Opacity washes over text (archived project rows,
  adjacent-month calendar days) are replaced with color/border treatments for the same reason.
- **Touch ergonomics ride the `pointer-coarse:` variant**: >=44px targets (padding bumps or
  the `tap` hit-area utility), >=16px form fields so iOS never zooms, heatmap cells scaled to
  the WCAG 2.5.8 24px-with-spacing minimum (a year of 44px cells would be ~2600px of scroll;
  the calendar view carries full-size targets for the same day-selection action).
- **Wide data surfaces scroll in their own `overflow-x-auto` containers** (heatmap, effort
  trend, project stack, calendar) with `minmax(0,1fr)`/`min-w-0` grid tracks so intrinsic SVG
  width can never widen the page.

## Consequences

Easier: one-handed capture and navigation on phones; add-to-home-screen installs look native
(manifest + Ferdy icons + paper `theme-color`); axe (WCAG 2.1 A/AA) runs clean on every route
at 390px and 1280px, verified by `scripts/mobile-verify.mjs` against a live browser.

Harder / to keep in mind: the darkened green makes primary actions visually heavier; any
future lightening must re-clear 4.5:1 with `on-green`. `ink-faint` must never be used for
readable text again (DESIGN.md now says so). The quick-add form renders in up to three places
on one page, so its field ids are `useId`-scoped; new fields must follow. jsdom lacks
`showModal`, so sheet tests polyfill it. Rejected: a hamburger/menu sheet (two taps to
navigate, not thumb-reachable), 44px heatmap cells (unusable scroll span), `maximum-scale=1`
to stop iOS focus zoom (breaks accessibility zoom; 16px inputs solve it instead).
