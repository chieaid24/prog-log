// UA-010: visually small controls must offer at least a 24x24 hit area on
// fine pointers (the .tap overlay only existed under pointer: coarse, so
// desktop delete/detail controls measured 16-20px). Red while the delete
// button's effective hit area is under 24px in either dimension.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/?view=heatmap&day=2026-07-14");
  const hit = await page.evaluate(() => {
    const el = document.querySelector('section[aria-label^="Entries for"] button[aria-label^="Delete"]');
    const own = el.getBoundingClientRect();
    const after = getComputedStyle(el, "::after");
    const w = after.content !== "none" ? Math.max(own.width, parseFloat(after.width) || 0) : own.width;
    const h = after.content !== "none" ? Math.max(own.height, parseFloat(after.height) || 0) : own.height;
    return { w, h };
  });
  assert.ok(
    hit.w >= 24 && hit.h >= 24,
    `delete button hit area below 24px on fine pointer: ${hit.w}x${hit.h}`,
  );
} finally {
  await browser.close();
}
console.log("UA-010 green");
