---
name: prog-log
description: A warm, light daily work log where a pixel frog sits on your pile of logged work.
colors:
  ink: "oklch(0.27 0.012 80)"
  ink-muted: "oklch(0.52 0.012 85)"
  ink-faint: "oklch(0.68 0.01 90)"
  paper: "oklch(0.972 0.008 95)"
  surface: "oklch(0.995 0.004 95)"
  surface-sunken: "oklch(0.945 0.01 95)"
  border: "oklch(0.90 0.008 95)"
  border-strong: "oklch(0.83 0.01 90)"
  frog-green: "oklch(0.62 0.13 148)"
  frog-green-strong: "oklch(0.54 0.13 148)"
  frog-green-soft: "oklch(0.93 0.045 148)"
  on-green: "oklch(0.99 0.004 95)"
  log-brown: "oklch(0.5 0.06 60)"
  warning-amber: "oklch(0.76 0.12 75)"
  danger-red: "oklch(0.58 0.17 27)"
  heat-0: "oklch(0.93 0.006 95)"
  heat-1: "oklch(0.85 0.05 148)"
  heat-2: "oklch(0.72 0.10 148)"
  heat-3: "oklch(0.60 0.14 148)"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.frog-green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.frog-green-strong}"
    textColor: "{colors.on-green}"
  button-soft:
    backgroundColor: "{colors.frog-green-soft}"
    textColor: "{colors.frog-green-strong}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: prog-log

> **This system is shipped.** The app wears it end to end (issue #10, ADR-0014); the old dark
> "space" theme is gone. Every UI change conforms to *this* system. When a request conflicts
> with a decision here, flag it, don't quietly diverge.

## 1. Overview

**Creative North Star: "Frog on a Log"**

prog-log is `prog-log` made literal: a pixel frog sitting on a growing stack of logged work.
The canvas is warm paper, quiet and generous, in the clean minimalist lineage of Claude Code
and Anthropic's surfaces. Onto that calm ground we place exactly one voice of color, a muted
leaf green, and exactly one character, an 8-bit frog. Everything else recedes so those two
things carry all the personality. This is a personal daily ritual, not an enterprise console,
and the interface should feel like a warm notebook someone actually wants to open.

The green is functional, never decorative: it means *your effort, here*. It fills the primary
action, lights the logging streak, and is the hue the contribution heatmap climbs toward. The
frog is the delight budget spent in one place: it greets empty states, marks a milestone, and
anchors the wordmark, then gets out of the way. Restraint is the whole strategy. The charm is
allowed to be loud precisely because the chrome around it is silent.

This system explicitly rejects three things. It is not a **generic SaaS dashboard** (no
hero-metric cards, no gradient text, no identical icon+heading+text grids). It is not a
**corporate analytics tool** (no enterprise-BI density, chart-junk, or cold chrome). And the
frog never tips into a **cutesy over-gamified habit app** (no badge grids, XP bars,
streak-shaming, or confetti storms). If it reads as "AI made a task tracker," the paper is too
white, the green is too neon, and the frog is missing.

**Key Characteristics:**
- Warm paper light theme; never `#fff`, never dark.
- One accent hue (muted frog green), one mascot (the 8-bit frog). Both earn their loudness through scarcity.
- Flat surfaces, hairline warm borders, whitespace as the primary structure.
- Data set in mono; prose set in a warm humanist sans.
- Quiet by default; the frog is the only thing allowed to be playful.

## 2. Colors

A warm, paper-toned neutral field carrying a single muted leaf-green accent. Every neutral is
tinted toward warm (hue ~80-95), never a cold or pure gray.

### Primary
- **Frog Green** (`oklch(0.62 0.13 148)`): the one accent. Primary buttons, the active logging
  streak, selected states, links, focus emphasis. A natural, slightly muted leaf green, not a
  screen green.
- **Frog Green Strong** (`oklch(0.54 0.13 148)`): hover/pressed state of anything green, and
  green text that needs contrast on paper (a raw accent-on-paper link can be too light).
- **Frog Green Soft** (`oklch(0.93 0.045 148)`): pale green tint for soft/secondary buttons,
  selected-row backgrounds, and gentle highlights.

### Neutral
- **Paper** (`oklch(0.972 0.008 95)`): the app background. Warm ivory, the calm ground everything sits on.
- **Surface** (`oklch(0.995 0.004 95)`): raised cards, inputs, popovers. A warm near-white that lifts a hair off paper.
- **Surface Sunken** (`oklch(0.945 0.01 95)`): inset tracks (segmented controls, progress rails) that sit *below* paper.
- **Ink** (`oklch(0.27 0.012 80)`): primary text. Warm near-black, never `#000`.
- **Ink Muted** (`oklch(0.52 0.012 85)`): secondary text, labels, captions.
- **Ink Faint** (`oklch(0.68 0.01 90)`): placeholders, disabled text, the faintest metadata.
- **Border** (`oklch(0.90 0.008 95)`): default hairline dividers and card outlines.
- **Border Strong** (`oklch(0.83 0.01 90)`): hover borders and emphasis separators.
- **Log Brown** (`oklch(0.5 0.06 60)`): the frog's log. A warm secondary reserved for mascot art and the rare woody accent; not a UI color.

### Semantic
- **Warning Amber** (`oklch(0.76 0.12 75)`) / **Danger Red** (`oklch(0.58 0.17 27)`): used sparingly, text-labelled, never as the only signal.
- **Success** reuses **Frog Green**; in a green-accented system a separate success hue is noise.

### Heatmap Ramp (signature)
The contribution heatmap climbs a **lightness ramp of one hue**, so it reads for color-blind
users and prints in grayscale:
- **heat-0** (`oklch(0.93 0.006 95)`): no Entry that day (warm gray, not green).
- **heat-1** (`oklch(0.85 0.05 148)`): Small Time Commitment (weight 1).
- **heat-2** (`oklch(0.72 0.10 148)`): Medium (weight 2).
- **heat-3** (`oklch(0.60 0.14 148)`): Large (weight 3).

### Named Rules
**The One Green Rule.** Green is the only accent hue in the system, and it means "your effort."
It covers at most ~10% of any screen. If two things are green and only one is an action or a
logged value, one of them is wrong.

**The Warm Neutral Rule.** No pure gray, ever. Every neutral is tinted warm (chroma ~0.005-0.012
toward hue 80-95). A cold gray on this paper reads as a bug.

## 3. Typography

**Display / Body Font:** Hanken Grotesk (with `ui-sans-serif, system-ui, sans-serif`)
**Label / Mono Font:** Geist Mono (with `ui-monospace, SFMono-Regular, monospace`)

**Character:** A warm humanist grotesque does all the reading, human and unfussy, close in
temperature to Anthropic's own type. Everything that is *data*, a date, a streak count, a
Time Commitment, a project count, is set in the mono so numbers align and read as instrument
output. Sans for language, mono for measurement.

### Hierarchy
- **Display** (700, `clamp(1.75rem, 3vw, 2.25rem)`, 1.1, `-0.02em`): page titles, the wordmark, the `/now` hero. One per view.
- **Headline** (600, `1.5rem`, 1.2): section headers (a month name, "Throwbacks").
- **Title** (600, `1.125rem`, 1.3): card headers, a project name in a list.
- **Body** (400, `1rem`, 1.6): descriptions and prose. Cap measure at 65-75ch.
- **Label** (Geist Mono, 500, `0.8125rem`, `0.02em`): dates, S/M/L badges, streak counts, axis ticks, metadata.

### Named Rules
**The Mono-for-Measurement Rule.** If it's a number the user logged or the system counted, it's
mono. If it's a word, it's sans. No mono paragraphs, no sans data tables.

**The Scale-and-Weight Rule.** Hierarchy comes from size (ratio ~1.25) and weight (400 to 700),
never from color. Muted text is for de-emphasis, not for headings.

## 4. Elevation

Flat by default. Depth comes from **hairline warm borders and tonal layering** (paper vs.
surface vs. sunken), not from shadows. Cards are `1px` `border` on `surface`; that is the entire
elevation vocabulary for at-rest content. This keeps the light theme crisp and avoids the muddy
gray drop-shadows that make a light UI look like 2014.

Shadows exist for exactly one job: content that genuinely floats above the page (dropdown menus,
the quick-add popover, toasts). One soft, warm, low shadow, never a hard dark one.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 1px 2px oklch(0.27 0.01 80 / 0.05), 0 8px 24px oklch(0.27 0.01 80 / 0.10)`): floating surfaces only.

### Named Rules
**The Flat-Paper Rule.** At-rest surfaces are flat: border + tint, zero shadow. A shadow on a
card that isn't floating is prohibited. If you reach for a shadow to separate two cards, add
space or a hairline instead.

## 5. Components

### Buttons
- **Shape:** gently rounded (`8px`, `rounded.md`).
- **Primary:** `Frog Green` fill, `On Green` text, `10px 16px`. The one green thing on most screens; reserve it for the main action (log an Entry, save).
- **Hover / Focus:** background shifts to `Frog Green Strong`; `:focus-visible` shows a 2px `Frog Green` ring at `2px` offset. Never remove focus outlines, only restyle.
- **Soft:** `Frog Green Soft` background, `Frog Green Strong` text, for secondary affirmatives.
- **Ghost:** `surface` background, `1px border`, `ink` text; hover raises the border to `Border Strong`. For tertiary/quiet actions.

### Chips
- **Style:** `surface` background, `1px border`, `Ink Muted` text, fully rounded (`full`), `2px 8px`, mono-ish label size.
- **Project identity:** a chip is a small color **dot + the project name as text**. Identity is never color alone; the dot carries the project color, the text carries the name (preserve this from the current ProjectChip).
- **State:** selected filters gain `Frog Green Soft` fill and `Frog Green Strong` text, plus a weight bump, never green-fill alone.

### Cards / Containers
- **Corner Style:** `12px` (`rounded.lg`).
- **Background:** `surface` on the `paper` page.
- **Shadow Strategy:** none (see The Flat-Paper Rule). Separation is `1px border` + spacing.
- **Internal Padding:** `16px` (`spacing.lg`); tighter dense lists may use `12px`.
- Nested cards are prohibited. If content inside a card needs grouping, use space or a hairline divider.

### Inputs / Fields
- **Style:** `surface` background, `1px border`, `8px` radius, `8px 12px` padding, `Ink Faint` placeholders.
- **Focus:** border shifts to `Frog Green` and the `:focus-visible` ring appears; no glow.
- **Disabled:** `surface-sunken` background, `Ink Faint` text.

### Navigation
- Quiet top nav on `paper`: sans labels in `Ink Muted`, the active item in `Ink` with a `Frog Green` underline or dot. No heavy chrome, no boxed nav bar. The wordmark (with the frog) sits at the left.

### The Frog (signature)
- An **8-bit / pixel-art frog on a log**, rendered as crisp pixel SVG (`image-rendering: pixelated`, `shape-rendering: crispEdges`), green body over `Log Brown`.
- **Where it appears:** the wordmark, empty states ("no Entries yet, the frog is waiting"), the milestone moment, the `/now` portfolio header, and 404/loading. One frog per view, never a field of them.
- **Motion:** at most a small idle blink or a single hop when a milestone lands. Fully governed by `prefers-reduced-motion`, which drops it to a static frog.
- **A11y:** decorative beside text, `aria-hidden`; standalone, a short `alt`.

## 6. Do's and Don'ts

### Do:
- **Do** keep the background warm paper (`oklch(0.972 0.008 95)`) and text warm ink (`oklch(0.27 0.012 80)`); tint every neutral toward warm.
- **Do** spend green only on action and on logged effort. Its scarcity is the point (The One Green Rule).
- **Do** set every logged number, date, and count in Geist Mono; set language in Hanken Grotesk.
- **Do** convey depth with `1px` warm borders and tonal layering; keep at-rest surfaces flat.
- **Do** give the heatmap its lightness ramp (heat-0 to heat-3) so it survives color-blindness and grayscale.
- **Do** let the frog carry the personality, then get out of the way.

### Don't:
- **Don't** use `#000` or `#fff`, cold grays, or any dark theme. This app is light and warm.
- **Don't** go neon green, glowing gradients, or glassmorphism, the dark "tool = cool" reflex is banned.
- **Don't** ship the generic SaaS dashboard: no hero-metric cards, no gradient text, no identical icon+heading+text card grids.
- **Don't** drift corporate-analytics: no enterprise-BI density, chart-junk, or cold impersonal chrome.
- **Don't** over-gamify the frog: no badge grids, XP bars, streak-shaming, mascot-spam, or confetti storms.
- **Don't** put a shadow on an at-rest card, use `border-left`/`border-right` > 1px as a colored stripe, or nest cards.
- **Don't** signal state with green alone; pair it with text, weight, icon, or border for color-blind users.
- **Don't** use em dashes (or `--`) in UI copy.
