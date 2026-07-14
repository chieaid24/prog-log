// UA-006: on phones the fixed log button must not sit over the day-detail
// panel's own form controls (taps meant for the select/size/milestone land
// on the button). Red while the button intersects any panel control.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("mobile", { authed: true });
try {
  const page = await openPage("/?view=heatmap&day=2026-07-14");
  const overlap = await page.evaluate(() => {
    const fab = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent || "").includes("Log today's work"),
    );
    if (!fab) return { fab: false, hits: [] };
    const f = fab.getBoundingClientRect();
    const controls = [
      ...document.querySelectorAll(
        'section[aria-label^="Entries for"] select, section[aria-label^="Entries for"] input, section[aria-label^="Entries for"] button, section[aria-label^="Entries for"] textarea',
      ),
    ];
    const hits = controls
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return f.left < r.right && f.right > r.left && f.top < r.bottom && f.bottom > r.top;
      })
      .map((el) => el.tagName + (el.getAttribute("aria-label") ?? el.textContent ?? "").slice(0, 20));
    return { fab: true, hits };
  });
  assert.deepEqual(
    overlap.hits ?? [],
    [],
    `floating log button overlaps day-detail controls: ${JSON.stringify(overlap.hits)}`,
  );
} finally {
  await browser.close();
}
console.log("UA-006 green");
