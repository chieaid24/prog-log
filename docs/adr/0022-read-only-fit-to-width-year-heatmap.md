# 0022 - Make the year heatmap read-only and fit to width

- **Status:** accepted
- **Date:** 2026-08-03
- **Related:** PRD sections 3.1.1 and 3.1.2; issue #54; ADR-0005

## Context

The daily log shipped a trailing-year heatmap and month calendar that both selected a day. The
heatmap used focusable, clickable cells sized for touch, which made the full year wider than its
card and required horizontal scrolling. The calendar already gives each day a larger target and
shows the detail and quick-add flow with more context.

## Decision

The heatmap is a read-only contribution graph. Its cells keep a title with the date and logged
effort, but they have no click, keyboard, focus, or button behavior. Day selection and the day
detail flow live only in the calendar.

The heatmap renders the complete range in one SVG view box that scales down to its container and
never scrolls horizontally. It opens on the trailing 365 days ending today. Year controls page
back through complete calendar years, and the next control never moves beyond today. The calendar
opens by default, and both card headers contain the view switch.

This choice diverges from PRD sections 3.1.1 and 3.1.2, which gave both views the same date-selection
behavior. It does not supersede ADR-0005: both competing views still ship, but each now has one job.

## Consequences

The heatmap shows the full year at desktop, tablet, and phone widths without hiding earlier weeks.
Phone cells are small because they carry no touch target. The calendar remains the only route into
day detail and quick add. Historical heatmap ranges require a range-scoped entry fetch.

Rejected alternatives were keeping touch-sized cells and horizontal scrolling, which hid most of
the year on phones, and measuring the card in JavaScript, which added client state for a scale that
SVG already provides.
