// UA-023: card padding is uniform (16px, or 12px for dense surfaces); the
// stat tile card mixed 12px vertical with 16px horizontal. Red while its
// axes differ.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/monthly");
  const pad = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('section[aria-label="Month at a glance"]'));
    return { top: s.paddingTop, left: s.paddingLeft };
  });
  assert.equal(pad.top, pad.left, `stat tile card padding mixed: ${JSON.stringify(pad)}`);
} finally {
  await browser.close();
}
console.log("UA-023 green");
