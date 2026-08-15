// UA-003: at 390px the month nav must not wrap text inside the title or the
// "This month" link (long month names wrapped both to two lines). Red while
// either element renders taller than a single line box.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("mobile", { authed: true });
try {
  // The monthly view moved to /progress (issue #73); the month nav came along.
  const page = await openPage("/progress?month=2024-01");
  const boxes = await page.evaluate(() => {
    const h1 = document.querySelector('nav[aria-label="Month"] h2');
    const link = [...document.querySelectorAll('nav[aria-label="Month"] a')].find((a) =>
      a.textContent.includes("This month"),
    );
    const line = (el) => parseFloat(getComputedStyle(el).lineHeight);
    return {
      h1: { height: h1.getBoundingClientRect().height, line: line(h1) },
      link: link ? { height: link.getBoundingClientRect().height, line: line(link) } : null,
    };
  });
  assert.ok(
    boxes.h1.height < boxes.h1.line * 1.5,
    `month title wraps at 390px: box ${boxes.h1.height}px vs line ${boxes.h1.line}px`,
  );
  assert.ok(boxes.link, "This month link not found on a past month");
  // The link has vertical padding (6-12px per pointer variant); anything past
  // one line box + padding headroom means the label itself wrapped.
  assert.ok(
    boxes.link.height < boxes.link.line + 28,
    `"This month" label wraps at 390px: box ${boxes.link.height}px vs line ${boxes.link.line}px`,
  );
} finally {
  await browser.close();
}
console.log("UA-003 green");
