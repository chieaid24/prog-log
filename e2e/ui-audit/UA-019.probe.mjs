// UA-019: gaps sit on the spacing scale (4/8/12/16/24/32/48); the /now card
// header row used 10px. Red while that gap is off-scale.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const SCALE = new Set(["4px", "8px", "12px", "16px", "24px", "32px", "48px"]);

const { browser, openPage } = await launch("desktop", { authed: false });
try {
  const page = await openPage("/now");
  const gap = await page.evaluate(() => {
    const row = document.querySelector("main ol > li div.flex.items-center");
    return getComputedStyle(row).columnGap;
  });
  assert.ok(SCALE.has(gap), `now card header gap ${gap} is off the spacing scale`);
} finally {
  await browser.close();
}
console.log("UA-019 green");
