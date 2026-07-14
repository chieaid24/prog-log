// UA-007: while the log sheet is open, Tab must cycle inside the dialog;
// focus escaping to <body> leaves keyboard users with no visible focus.
// Red while any Tab press in a full cycle lands outside the dialog.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("mobile", { authed: true });
try {
  const page = await openPage("/");
  await page.getByRole("button", { name: /log today's work/i }).click();
  const dialog = page.locator("dialog.log-sheet");
  await dialog.waitFor({ state: "visible" });
  // Enable "Log it" so the full control set is tabbable.
  await page.locator("dialog.log-sheet select").first().selectOption({ index: 1 });
  await page.locator('dialog.log-sheet [role="group"] button').first().click();

  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => {
      const d = document.querySelector("dialog.log-sheet");
      return {
        inside: d.contains(document.activeElement),
        tag: document.activeElement?.tagName,
      };
    });
    assert.ok(
      where.inside,
      `Tab press ${i + 1} moved focus outside the open dialog (activeElement: ${where.tag})`,
    );
  }
} finally {
  await browser.close();
}
console.log("UA-007 green");
