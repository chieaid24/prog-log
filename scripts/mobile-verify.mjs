// Mobile + a11y verification harness (issue #11). Drives the real app in
// Chromium: signs in as the owner via an admin-generated magic link, asserts
// zero horizontal page overflow at phone/tablet widths, runs axe (WCAG 2.1 A
// + AA) on every route, exercises the full mobile capture flow end-to-end
// (then deletes the entry it created, leaving data untouched), and saves
// screenshots for PR evidence.
//
//   node scripts/mobile-verify.mjs [outdir] [baseURL]
//
// Requires .env.local (Supabase URL, service-role key, OWNER_USER_ID) and a
// running dev server. Read-only apart from the create-then-delete capture
// probe. Not part of CI; CI covers the jsdom suites.
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const OUT = process.argv[2] ?? "verify-out";
const BASE = process.argv[3] ?? "http://localhost:3111";
mkdirSync(OUT, { recursive: true });

// --- env ---
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
// Plain REST against GoTrue admin + PostgREST (supabase-js needs Node 22+
// websockets); the service role key authorizes both.
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const HEADERS = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function sb(path, init = {}) {
  const res = await fetch(SB + path, { ...init, headers: { ...HEADERS, ...init.headers } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const AXE_SOURCE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const AUTHED_ROUTES = ["/", "/monthly", "/projects", "/settings"];
const GUEST_ROUTES = ["/login", "/now"];
const WIDTHS = [320, 360, 390, 414, 768];

function today(timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

async function ownerContext(browser, options) {
  const user = await sb(`/auth/v1/admin/users/${env.OWNER_USER_ID}`);
  const link = await sb("/auth/v1/admin/generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "magiclink", email: user.email }),
  });
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(
    `${BASE}/auth/confirm?token_hash=${link.hashed_token}&type=magiclink`,
  );
  await page.waitForURL(`${BASE}/`);
  await page.close();
  return context;
}

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL ${msg}`);
};

async function checkOverflow(page, label) {
  const o = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  if (o.doc > 1 || o.body > 1) fail(`${label}: horizontal overflow doc=${o.doc}px body=${o.body}px`);
  else console.log(`ok   ${label}: no horizontal overflow`);
}

async function runAxe(page, label) {
  await page.addScriptTag({ content: AXE_SOURCE });
  const result = await page.evaluate(() =>
    window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    }),
  );
  if (result.violations.length > 0) {
    fail(`${label}: ${result.violations.length} axe violations`);
    for (const v of result.violations) {
      console.error(`     [${v.impact}] ${v.id}: ${v.help}`);
      for (const n of v.nodes.slice(0, 3)) console.error(`       ${n.target.join(" ")}`);
    }
  } else {
    console.log(`ok   ${label}: axe clean (WCAG 2.1 A/AA)`);
  }
}

const browser = await chromium.launch();

// --- 1. Overflow + screenshots at phone/tablet widths (touch emulated) ---
for (const authed of [true, false]) {
  const routes = authed ? AUTHED_ROUTES : GUEST_ROUTES;
  for (const width of WIDTHS) {
    const options = {
      viewport: { width, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: width < 768,
    };
    const context = authed ? await ownerContext(browser, options) : await browser.newContext(options);
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      await checkOverflow(page, `${route} @${width}`);
      const slug = route === "/" ? "log" : route.slice(1).replace(/\//g, "-");
      if ([360, 768].includes(width)) {
        await page.screenshot({ path: join(OUT, `${slug}-${width}.png`), fullPage: true });
      }
    }
    await context.close();
  }
}

// --- 2. Desktop sanity screenshots (no touch) ---
{
  const context = await ownerContext(browser, { viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  for (const route of AUTHED_ROUTES) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await checkOverflow(page, `${route} @1280`);
    const slug = route === "/" ? "log" : route.slice(1).replace(/\//g, "-");
    await page.screenshot({ path: join(OUT, `${slug}-1280.png`), fullPage: true });
  }
  await context.close();
}

// --- 3. axe on every route, mobile + desktop ---
for (const [label, options] of [
  ["@390", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ["@1280", { viewport: { width: 1280, height: 900 } }],
]) {
  const authedCtx = await ownerContext(browser, options);
  const guestCtx = await browser.newContext(options);
  for (const route of [...AUTHED_ROUTES, ...GUEST_ROUTES]) {
    const page = await (AUTHED_ROUTES.includes(route) ? authedCtx : guestCtx).newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await runAxe(page, `${route} ${label}`);
    await page.close();
  }
  await authedCtx.close();
  await guestCtx.close();
}

// --- 4. Capture flow end-to-end at 390px: sheet -> log -> verify -> delete ---
{
  const settings = await sb(
    `/rest/v1/app_settings?select=timezone&user_id=eq.${env.OWNER_USER_ID}`,
  );
  const day = today(settings[0]?.timezone ?? "UTC");

  const projects = await sb(
    `/rest/v1/projects?select=id,name&user_id=eq.${env.OWNER_USER_ID}&status=eq.active`,
  );
  const todays = await sb(
    `/rest/v1/entries?select=project_id&user_id=eq.${env.OWNER_USER_ID}&entry_date=eq.${day}`,
  );
  const used = new Set(todays.map((e) => e.project_id));
  let candidate = projects.find((p) => !used.has(p.id));
  let scratch = null;
  if (!candidate) {
    // Every project is logged today: use a scratch project, removed at the end.
    [scratch] = await sb("/rest/v1/projects", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: env.OWNER_USER_ID,
        name: `a11y probe ${Date.now()}`,
        status: "active",
      }),
    });
    candidate = scratch;
    console.log(`capture probe: created scratch project ${scratch.name}`);
  }
  {
    const context = await ownerContext(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /log today's work/i }).click();
    const dialog = page.locator("dialog.log-sheet");
    await dialog.waitFor({ state: "visible" });
    await page.screenshot({ path: join(OUT, "capture-sheet-390.png") });
    await dialog.getByLabel("Project").selectOption(candidate.id);
    await dialog.getByRole("button", { name: "Small" }).click();
    await dialog.getByRole("button", { name: "Log it" }).click();
    await page.getByText("Logged.").waitFor();
    await page.screenshot({ path: join(OUT, "capture-logged-390.png") });

    const created = await sb(
      `/rest/v1/entries?select=id&user_id=eq.${env.OWNER_USER_ID}&entry_date=eq.${day}&project_id=eq.${candidate.id}`,
    );
    if (created.length === 0) fail("capture probe: entry not found after logging");
    else console.log(`ok   capture probe: entry logged for ${candidate.name}`);

    // Clean up through the UI (also exercises day detail + delete on touch).
    await page.goto(`${BASE}/?view=heatmap&day=${day}`, { waitUntil: "networkidle" });
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: `Delete ${candidate.name} entry` })
      .click();
    await page.waitForTimeout(1500);
    const after = await sb(
      `/rest/v1/entries?select=id&user_id=eq.${env.OWNER_USER_ID}&entry_date=eq.${day}&project_id=eq.${candidate.id}`,
    );
    if (after.length > 0) fail("capture probe: cleanup delete did not remove the entry");
    else console.log("ok   capture probe: entry deleted, data restored");
    await context.close();
    if (scratch) {
      await fetch(`${SB}/rest/v1/projects?id=eq.${scratch.id}`, {
        method: "DELETE",
        headers: HEADERS,
      });
      console.log("ok   capture probe: scratch project removed");
    }
  }
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall mobile/a11y checks passed");
