// Demo-mode probe (issue #38): boots the app with DEMO_MODE=1 (no database,
// no credentials) and asserts every core view renders populated from the
// checked-in CSV fixtures, with the demo banner visible on each. Reuses the
// ui-audit browser harness (../ui-audit/support/page-context.mjs).
//
// Usage (from the repo root):
//   npm run probe:demo
// Set DEMO_PROBE_SHOTS=/some/dir to also capture full-page screenshots.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;
process.env.UA_BASE = BASE;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_URL = "https://github.com/chieaid24/prog-log";
const shotsDir = process.env.DEMO_PROBE_SHOTS;

// Dummy Supabase values: DEMO_MODE never issues a query, the client only
// needs strings to construct. The site URL stays unset so the probe pins
// the no-real-app-link rendering.
const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  cwd: repoRoot,
  env: {
    ...process.env,
    DEMO_MODE: "1",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54998",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo-anon",
    SUPABASE_SERVICE_ROLE_KEY: "demo-service",
    NEXT_PUBLIC_SITE_URL: "",
  },
  stdio: ["ignore", "ignore", "inherit"],
  detached: true,
});

async function waitReady(route, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(BASE + route);
      if (res.ok) return;
    } catch {
      // Server still booting; keep polling.
    }
    if (Date.now() > deadline) throw new Error(`dev server not ready for ${route}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function assertBanner(page, route) {
  const banner = page.locator('[data-testid="demo-banner"]');
  assert.ok(await banner.isVisible(), `${route}: demo banner visible`);
  const href = await banner
    .locator("a", { hasText: "View the source" })
    .getAttribute("href");
  assert.equal(href, SOURCE_URL, `${route}: banner links to the source`);
}

async function shoot(page, name) {
  if (!shotsDir) return;
  mkdirSync(shotsDir, { recursive: true });
  await page.screenshot({ path: join(shotsDir, `${name}.png`), fullPage: true });
}

try {
  await waitReady("/");
  await waitReady("/progress");
  await waitReady("/projects");
  await waitReady("/expeditions");

  const { launch } = await import("../ui-audit/support/page-context.mjs");
  const { browser, openPage } = await launch("desktop", { authed: false });
  try {
    // Dashboard: calendar is the default view (#70); throwbacks populated.
    const home = await openPage("/");
    await assertBanner(home, "/");
    const throwbacks = await home
      .locator("section[aria-labelledby='throwback-feed-title'] ol li")
      .count();
    assert.ok(throwbacks >= 1, `throwback items >= 1 (got ${throwbacks})`);
    await shoot(home, "demo-home");

    // Heatmap view: opt-in via ?view=heatmap since #70, pinned to the last
    // curated fixture month so the trailing-year window keeps the fixtures.
    const heatmap = await openPage("/?view=heatmap&month=2026-07");
    const label = await heatmap
      .locator("svg[aria-label$='logged days']")
      .getAttribute("aria-label");
    const loggedDays = Number(/(\d+) logged days/.exec(label ?? "")?.[1]);
    assert.ok(loggedDays >= 100, `heatmap logged days >= 100 (got ${loggedDays})`);
    const litCells = await heatmap.locator("rect[data-date]:not([data-level='0'])").count();
    assert.ok(litCells >= 100, `lit heatmap cells >= 100 (got ${litCells})`);
    await shoot(heatmap, "demo-heatmap");

    // Calendar view: pinned to the last curated fixture month (the fixtures
    // end 2026-07-25), not the wall-clock month, so the probe stays green
    // after real time rolls past the fixture window.
    const calendar = await openPage("/?view=calendar&month=2026-07");
    const cards = await calendar.locator("[data-testid='calendar-card']").count();
    assert.ok(cards >= 5, `calendar cards >= 5 (got ${cards})`);
    await shoot(calendar, "demo-calendar");

    // Progress: the timeline renders moments and the retained monthly
    // analytics stay populated from the same all-time fetch.
    const progress = await openPage("/progress");
    await assertBanner(progress, "/progress");
    const momentCards = await progress
      .locator("section[aria-label='Progress timeline'] article")
      .count();
    assert.ok(momentCards >= 1, `progress timeline moments >= 1 (got ${momentCards})`);
    await shoot(progress, "demo-progress");

    // Projects: fixture projects listed, archived history included.
    const projects = await openPage("/projects");
    await assertBanner(projects, "/projects");
    const projectsText = await projects.locator("body").innerText();
    for (const name of ["Work", "Turkish", "Thesis"]) {
      assert.ok(projectsText.includes(name), `project ${name} listed`);
    }
    await shoot(projects, "demo-projects");

    // Expeditions: fixture todo list and answered showcase both populated.
    const expeditions = await openPage("/expeditions");
    await assertBanner(expeditions, "/expeditions");
    const openItems = await expeditions
      .locator("section[aria-label='Open Expeditions'] ul li")
      .count();
    assert.ok(openItems >= 3, `open expeditions >= 3 (got ${openItems})`);
    const answeredThumbs = await expeditions
      .locator("section[aria-label='Answered Expeditions'] ul li img")
      .count();
    assert.ok(answeredThumbs >= 1, `answered expedition thumbnails >= 1 (got ${answeredThumbs})`);
    await shoot(expeditions, "demo-expeditions");

    console.log(
      "demo probe green: /, /progress, /projects and /expeditions render populated with the demo banner",
    );
  } finally {
    await browser.close();
  }
} finally {
  process.kill(-server.pid, "SIGTERM");
}
