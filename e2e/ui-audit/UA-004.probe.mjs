// UA-004: no focusable element may live inside the project-stack chart's
// aria-hidden wrapper (Recharts injects svg[tabindex=0] by default). Red
// while axe reports aria-hidden-focus on /monthly.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { launch } from "./support/page-context.mjs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/monthly");
  await page.addScriptTag({ content: axeSource });
  const ids = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations.map((v) => v.id);
  });
  assert.ok(!ids.includes("aria-hidden-focus"), `axe reports aria-hidden-focus on /monthly: ${ids.join(", ")}`);
} finally {
  await browser.close();
}
console.log("UA-004 green");
