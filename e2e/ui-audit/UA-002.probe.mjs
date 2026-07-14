// UA-002: the month calendar's ARIA grid must nest gridcells inside rows.
// Red while axe reports aria-required-children / aria-required-parent on it.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { launch } from "./support/page-context.mjs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/?view=calendar");
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(
      document.querySelector('section[aria-label="Month calendar"]'),
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } },
    );
    return result.violations.map((v) => v.id);
  });
  assert.deepEqual(
    violations.filter((id) => id === "aria-required-children" || id === "aria-required-parent"),
    [],
    `calendar grid structure violations: ${violations.join(", ")}`,
  );
} finally {
  await browser.close();
}
console.log("UA-002 green");
