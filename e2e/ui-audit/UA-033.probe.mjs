// UA-033: calendar day-card project names must not ellipsize - the old 640px
// grid floor truncated roughly half of them (issue #22, ADR-0025). Pins the
// 700px floor and the star-replaces-letter rule: fixture months render zero
// truncated names at both viewports, and a milestone card shows the star
// instead of the S/M/L letter.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

function prevMonth(m) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
const thisMonth = new Intl.DateTimeFormat("en-CA").format(new Date()).slice(0, 7);
const months = [thisMonth, prevMonth(thisMonth)];

for (const vp of ["mobile", "desktop"]) {
  const { browser, openPage } = await launch(vp, { authed: true });
  try {
    for (const m of months) {
      const page = await openPage(`/?view=calendar&month=${m}`);
      const r = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[data-testid="calendar-card"]')];
        return {
          total: cards.length,
          truncated: cards
            .map((c) => c.querySelector("span.truncate"))
            .filter((s) => s.scrollWidth > s.clientWidth)
            .map((s) => s.textContent),
          starredWithLetter: cards.filter(
            (c) => c.querySelector('[aria-label="Has milestone"]') && c.querySelector("span.font-mono"),
          ).length,
        };
      });
      assert.ok(r.total > 0, `${vp} ${m}: no day-cards rendered`);
      assert.deepEqual(r.truncated, [], `${vp} ${m}: truncated names: ${r.truncated.join(", ")}`);
      assert.equal(r.starredWithLetter, 0, `${vp} ${m}: milestone card also renders the size letter`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
console.log("UA-033 green");
