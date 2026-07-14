// UA-020: every quick-add field carries the coarse-pointer padding bump;
// the description textarea was the one sibling without it. Red while its
// vertical padding is under 12px on touch.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("mobile", { authed: true });
try {
  const page = await openPage("/");
  await page.getByRole("button", { name: /log today's work/i }).click();
  await page.locator("dialog.log-sheet").waitFor({ state: "visible" });
  await page.locator("dialog.log-sheet").getByText("+ add detail").click();
  const pad = await page
    .locator("dialog.log-sheet textarea")
    .evaluate((el) => getComputedStyle(el).paddingTop);
  assert.equal(pad, "12px", `textarea coarse padding is ${pad}, siblings use 12px`);
} finally {
  await browser.close();
}
console.log("UA-020 green");
