// UA-015: the calendar month title is a Headline per DESIGN.md ("a month
// name") - 24px / 600. Red while it renders at Body size.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/?view=calendar");
  const h2 = await page.evaluate(() => {
    const el = document.querySelector("section h2");
    const s = getComputedStyle(el);
    return { size: s.fontSize, weight: s.fontWeight };
  });
  assert.equal(h2.size, "24px", `month title is ${h2.size}, Headline is 24px`);
  assert.equal(h2.weight, "600", `month title weight is ${h2.weight}, Headline is 600`);
} finally {
  await browser.close();
}
console.log("UA-015 green");
