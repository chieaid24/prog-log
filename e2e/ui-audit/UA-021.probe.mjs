// UA-021: buttons are gently rounded at 8px (DESIGN.md rounded.md); the
// sheet's size-segment buttons and close button rendered 6px (Tailwind
// stock rounded-md). Red while either computes under 8px.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("mobile", { authed: true });
try {
  const page = await openPage("/");
  await page.getByRole("button", { name: /log today's work/i }).click();
  await page.locator("dialog.log-sheet").waitFor({ state: "visible" });
  const radii = await page.evaluate(() => ({
    segment: getComputedStyle(document.querySelector('dialog.log-sheet [role="group"] button'))
      .borderRadius,
    close: getComputedStyle(document.querySelector('dialog.log-sheet [aria-label="Close"]'))
      .borderRadius,
  }));
  assert.deepEqual(
    radii,
    { segment: "8px", close: "8px" },
    `sheet buttons off the 8px radius: ${JSON.stringify(radii)}`,
  );
} finally {
  await browser.close();
}
console.log("UA-021 green");
