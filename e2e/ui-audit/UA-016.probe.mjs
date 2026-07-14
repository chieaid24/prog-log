// UA-016: chart axis ticks follow the Label spec (Geist Mono, 13px) - the
// project-stack Y axis rendered sans 12px while its X axis was mono 11px.
// Red while any tick on /monthly is non-mono or under 13px.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/monthly");
  const offenders = await page.evaluate(() => {
    const bad = [];
    const sections = [
      'section[aria-labelledby="effort-trend-title"]',
      'section[aria-labelledby="project-stack-title"]',
    ];
    for (const sel of sections) {
      const svgTexts = document.querySelectorAll(`${sel} svg text`);
      for (const t of svgTexts) {
        const s = getComputedStyle(t);
        const size = parseFloat(s.fontSize);
        if (!s.fontFamily.includes("Geist Mono") || size < 12.9) {
          bad.push(`${sel} "${t.textContent}": ${s.fontFamily.split(",")[0]} ${s.fontSize}`);
        }
      }
    }
    return bad;
  });
  assert.deepEqual(offenders, [], `ticks off the Label spec: ${offenders.slice(0, 4).join("; ")}`);
} finally {
  await browser.close();
}
console.log("UA-016 green");
