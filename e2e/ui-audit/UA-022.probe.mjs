// UA-022: counted numbers set in mono (DESIGN.md Mono-for-Measurement);
// the projects section-heading counts rendered sans while row counts are
// mono. Red while the heading count is not Geist Mono.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/projects");
  const family = await page.evaluate(
    () =>
      getComputedStyle(
        document.querySelector('section[aria-label="Active projects"] h2 span'),
      ).fontFamily,
  );
  assert.ok(family.includes("Geist Mono"), `heading count renders in ${family.split(",")[0]}`);
} finally {
  await browser.close();
}
console.log("UA-022 green");
