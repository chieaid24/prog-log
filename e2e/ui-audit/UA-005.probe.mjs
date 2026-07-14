// UA-005: horizontally scrollable chart containers on /monthly must be
// keyboard-operable at phone width. Red while axe reports
// scrollable-region-focusable there.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { launch } from "./support/page-context.mjs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const { browser, openPage } = await launch("mobile", { authed: true });
try {
  const page = await openPage("/monthly");
  await page.addScriptTag({ content: axeSource });
  const ids = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations.map((v) => v.id);
  });
  assert.ok(
    !ids.includes("scrollable-region-focusable"),
    `axe reports scrollable-region-focusable on /monthly: ${ids.join(", ")}`,
  );
} finally {
  await browser.close();
}
console.log("UA-005 green");
