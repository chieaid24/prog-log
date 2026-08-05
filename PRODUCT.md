# Product

## Register

product

## Users

One person: the developer who owns this log (self-hosted, single-user). Two contexts:

- **Capture** — logging what they worked on today, usually in a spare few seconds, from
  wherever they are: the web dashboard, a Discord `/log` slash command, or an iPhone
  share-sheet Shortcut. The job is *record it before I forget*, at almost zero friction.
- **Reflection** — coming back to see the year at a glance (heatmap), the Progress
  timeline (Reflections and Milestones over all time, with monthly breakdowns beneath),
  momentum/streaks, and Throwbacks (past milestones resurfacing on
  their anniversaries). The job is *feel the accumulation and be reminded of what I've done*.

A secondary, read-only audience sees the public `/now` snapshot as a lightweight portfolio.
It inherits the same design system rather than getting a separate marketing skin.

## Product Purpose

A self-hosted daily work log and project tracker. Log which Projects got worked on each day
at a rough Time Commitment (Small / Medium / Large), with optional Milestones. The log then
pays that back as insight: an effort-weighted contribution heatmap, a Progress timeline of
Reflections and Milestones (with monthly breakdowns beneath it), a
global streak plus per-project cadence, and Throwbacks. Success is: capture stays effortless
enough that it actually happens daily, and the accumulated history is rewarding enough to keep
the habit honest. It runs entirely on free tiers, built to be operated autonomously by agents.

Domain language is fixed in [CONTEXT.md](CONTEXT.md): Project, Entry, Time Commitment,
Milestone, Description, Reflection, Throwback. Use those terms exactly; honor their `Avoid` lists.

## Brand Personality

Playful, characterful, and calm. This is a personal ritual, not an enterprise instrument, and
it wears that on its sleeve through **Ferdy, an 8-bit frog sitting on a log** (the `prog-log`
pun made literal): the one mascot who greets empty states, marks milestones, and anchors the
wordmark. But charm comes from the mascot and a single green voice, *not* from loud chrome. The
execution is clean, light, and minimalist in the lineage of **Claude Code / Anthropic**: warm
paper surfaces, generous whitespace, restraint everywhere the frog isn't. Copy is warm and
first-person, never corporate. Delight is a well-placed pixel frog, not confetti.

## Anti-references

- **Generic SaaS dashboard.** No hero-metric template (big number, small label, gradient
  accent), no gradient text, no endless identical icon + heading + text card grids.
- **Corporate analytics tool.** No enterprise-BI density, chart-junk, or cold impersonal
  chrome. This is one person's log, not a Datadog console.
- **Cutesy over-gamified habit app.** The frog is one restrained charm mark, never a Duolingo
  owl: no mascot-spam, badge grids, streak-shaming, XP bars, or confetti storms. Momentum
  motivates through quiet reward, not gamified pressure.
- **The dark "tool = cool" reflex.** The app is deliberately light, warm, and minimal. Never
  neon-on-black, glowing gradients, or glassmorphism-by-default.

## Design Principles

- **Capture is sacred; never tax it.** Every surface converges on two taps to log. Friction in
  the capture path is the one unforgivable regression.
- **The log pays you back.** Nothing is just stored. Every Entry compounds into something the
  user gets to see and feel: heatmap intensity, a streak, a Throwback. Reflection is the reward
  for capture.
- **Celebrate, don't nag.** Motivate through delight (surfaced Milestones, rising cadence,
  anniversaries), never through guilt, loss-aversion, or streak-shaming.
- **One shared truth.** All three capture surfaces write through one path with one rule set
  (one Entry per Project per day, re-logging only ever raises the day). The UI should reflect
  that single source of truth, never diverge per surface.
- **Personal over corporate.** When a choice is between polished-generic and warm-specific,
  choose warm. This is someone's own tool; it should feel like it.

## Accessibility & Inclusion

Best-effort, no formal WCAG commitment. Keep the accommodations already in place: visible
`:focus-visible` rings everywhere, honored `prefers-reduced-motion` (any mascot motion must
degrade gracefully to none), and full keyboard navigation. Maintain legible contrast on the
warm light surface even without a formal AA/AAA target.

Two constraints the green + mascot direction adds: (1) **green is never the sole signal** for
color-blind users, pair it with text, weight, or icon (heatmap intensity rides a lightness
ramp, not hue alone; selected states carry a border or weight change, not just a green tint);
(2) the pixel frog is decorative, mark it `aria-hidden` when it sits beside real text and give
it a short `alt` when it stands alone.
