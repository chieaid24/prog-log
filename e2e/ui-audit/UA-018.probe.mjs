// UA-018: headings follow their DESIGN.md type tokens - login h1 (Title:
// 600, normal tracking), 404 h1 (Headline: 600), /now h1 (Display: fluid
// clamp to 36px at 1280) and /now project names (Title: 18px). Red while
// any of the four is off its token.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const offenders = [];
  const grab = (el, sel) => {
    const s = getComputedStyle(el);
    return { size: s.fontSize, weight: s.fontWeight, ls: s.letterSpacing, sel };
  };

  let page = await openPage("/login");
  const loginH1 = await page.locator("h1").evaluate(grab, "login h1");
  if (loginH1.weight !== "600" || loginH1.ls !== "normal")
    offenders.push(JSON.stringify(loginH1));
  await page.close();

  page = await openPage("/this-route-does-not-exist");
  const nfH1 = await page.locator("h1").evaluate(grab, "404 h1");
  if (nfH1.weight !== "600") offenders.push(JSON.stringify(nfH1));
  await page.close();

  page = await openPage("/now");
  const nowH1 = await page.locator("h1").evaluate(grab, "now h1");
  // Display at 1280px: clamp(28px, 3vw = 38.4px, 36px) resolves to 36px.
  if (nowH1.size !== "36px") offenders.push(JSON.stringify(nowH1));
  const nowH2 = await page.locator("main ol li h2").first().evaluate(grab, "now h2");
  if (nowH2.size !== "18px") offenders.push(JSON.stringify(nowH2));
  await page.close();

  assert.deepEqual(offenders, [], `headings off their tokens: ${offenders.join("; ")}`);
} finally {
  await browser.close();
}
console.log("UA-018 green");
