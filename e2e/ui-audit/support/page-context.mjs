// Shared browser context for ui-audit probes and inspections. Pins the same
// variance sources as the capture harness (motion, caret, fonts) so a
// measurement taken here matches the screenshots, and signs in through the
// mock GoTrue flow (see mock-supabase.mjs) when a flow needs the owner.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

export const BASE = process.env.UA_BASE ?? "http://localhost:3111";

export const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true },
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
};

const FREEZE_CSS = `*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}`;

/**
 * Launch a pinned context. Usage:
 *   const { browser, context, openPage } = await launch("mobile", { authed: true });
 *   const page = await openPage("/monthly");
 *   ...measure...
 *   await browser.close();
 */
export async function launch(vpName = "desktop", { authed = true } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext(VIEWPORTS[vpName]);
  if (authed) {
    const page = await context.newPage();
    await page.goto(`${BASE}/auth/confirm?token_hash=mock-token-hash&type=magiclink`);
    await page.waitForURL(`${BASE}/`);
    await page.close();
  }
  async function openPage(route) {
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  return { browser, context, openPage };
}
