// UA-001: keyboard focus on the import file input must be visible on the
// picker label the user actually sees (the input itself is sr-only, 1x1px).
// Red while the label shows no focus indicator when its input holds focus.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/settings");
  await page.locator("#tz").focus();
  let reached = false;
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.id === "import-file")) {
      reached = true;
      break;
    }
  }
  assert.ok(reached, "never reached #import-file by keyboard");
  const label = await page.evaluate(() => {
    const el = document.querySelector('label[for="import-file"]');
    const s = getComputedStyle(el);
    return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth };
  });
  assert.ok(
    label.outlineStyle !== "none" && label.outlineWidth !== "0px",
    `import picker label shows no focus indicator while its input is focused: ${JSON.stringify(label)}`,
  );
} finally {
  await browser.close();
}
console.log("UA-001 green");
