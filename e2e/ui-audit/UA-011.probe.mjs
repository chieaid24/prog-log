// UA-011: the entry delete button's hover state must keep AA contrast
// (danger-red on the sunken hover background measured 3.97:1). Red while
// the hovered text/background pair computes under 4.5:1.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const page = await openPage("/?view=heatmap&day=2026-07-14");
  const btn = page.locator('section[aria-label^="Entries for"] button[aria-label^="Delete"]').first();
  await btn.hover();
  await page.waitForTimeout(150);
  const ratio = await btn.evaluate((el) => {
    const parse = (c) => {
      const m = c.match(/[\d.]+/g).map(Number);
      return m.slice(0, 3);
    };
    // Resolve to sRGB via canvas so oklch/lab values compare correctly.
    const toRgb = (css) => {
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const lum = ([r, g, b]) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const fg = toRgb(getComputedStyle(el).color);
    let node = el;
    let bg = null;
    while (node && !bg) {
      const b = getComputedStyle(node).backgroundColor;
      if (b && !b.includes("0, 0, 0, 0") && b !== "transparent") bg = toRgb(b);
      node = node.parentElement;
    }
    bg = bg ?? [255, 255, 255];
    const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    void parse;
    return (l1 + 0.05) / (l2 + 0.05);
  });
  assert.ok(ratio >= 4.5, `delete hover contrast ${ratio.toFixed(2)}:1 is below 4.5:1`);
} finally {
  await browser.close();
}
console.log("UA-011 green");
