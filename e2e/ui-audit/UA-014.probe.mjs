// UA-014: calendar day-card links must expose an unambiguous accessible
// name; the raw content concatenates the project name with a bare size
// letter ("AI-Mm"). Red while the card has no aria-label separating the
// project from its Time Commitment.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/?view=calendar");
  const card = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="calendar-card"]');
    return { label: el.getAttribute("aria-label"), text: el.textContent };
  });
  assert.ok(
    card.label && /, (Small|Medium|Large)/.test(card.label),
    `day-card accessible name is ambiguous: aria-label=${card.label}, text=${JSON.stringify(card.text)}`,
  );
} finally {
  await browser.close();
}
console.log("UA-014 green");
