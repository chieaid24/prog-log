// UA-013: cards use 16px internal padding (DESIGN.md card spec; the app's
// dominant p-4 pattern). Red while the settings sections or the /now
// project cards still compute 20px.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const offenders = [];
  let page = await openPage("/settings");
  for (const label of ["Timezone", "Data", "Account"]) {
    const pad = await page.evaluate(
      (l) => getComputedStyle(document.querySelector(`section[aria-label="${l}"]`)).paddingTop,
      label,
    );
    if (pad !== "16px") offenders.push(`settings ${label}: ${pad}`);
  }
  await page.close();
  page = await openPage("/now");
  const pad = await page.evaluate(
    () => getComputedStyle(document.querySelector("main ol > li")).paddingTop,
  );
  if (pad !== "16px") offenders.push(`now project card: ${pad}`);
  await page.close();
  assert.deepEqual(offenders, [], `card padding off the 16px spec: ${offenders.join("; ")}`);
} finally {
  await browser.close();
}
console.log("UA-013 green");
