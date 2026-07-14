// UA-009: controls using the coarse-pointer padding bump must reach 44px
// tall on touch viewports; pointer-coarse:py-2.5 lands them at 42px
// (10+10 padding + 20px line + 2px border). Red while any flagged control
// measures under 44px.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("mobile", { authed: true });
try {
  const short = [];
  const collect = async (page, route, selectors) => {
    for (const [label, sel] of selectors) {
      const h = await page.evaluate((s) => {
        const el = document.querySelector(s);
        return el ? el.getBoundingClientRect().height : null;
      }, sel);
      if (h === null) short.push(`${route} ${label}: not found`);
      else if (h < 44) short.push(`${route} ${label}: ${h}px`);
    }
  };

  let page = await openPage("/?view=calendar");
  await collect(page, "/?view=calendar", [
    ["prev month", 'a[aria-label="Previous month"]'],
    ["next month", 'a[aria-label="Next month"]'],
    ["view toggle", 'nav[aria-label="Daily log view"] a'],
  ]);
  await page.close();

  page = await openPage("/monthly?month=2024-01");
  await collect(page, "/monthly", [
    ["prev month", 'a[aria-label="Previous month"]'],
    ["next month", 'a[aria-label="Next month"]'],
  ]);
  await page.close();

  page = await openPage("/projects");
  await collect(page, "/projects", [["row action", "li button"]]);
  await page.close();

  assert.deepEqual(short, [], `touch targets under 44px: ${short.join("; ")}`);
} finally {
  await browser.close();
}
console.log("UA-009 green");
