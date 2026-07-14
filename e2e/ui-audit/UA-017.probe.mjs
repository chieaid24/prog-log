// UA-017: primary buttons follow one recipe (the app-dominant px-4 py-2,
// 14px/600). The login submit (px-3, 16px/500) and the projects inline
// edit save (py-1.5) diverge. Red while either differs from the recipe.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const read = (el) => {
  const s = getComputedStyle(el);
  return {
    padV: s.paddingTop,
    padH: s.paddingLeft,
    size: s.fontSize,
    weight: s.fontWeight,
  };
};

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const offenders = [];
  let page = await openPage("/login");
  const login = await page.locator('button[type="submit"]').evaluate(read);
  if (JSON.stringify(login) !== JSON.stringify({ padV: "8px", padH: "16px", size: "14px", weight: "600" })) {
    offenders.push(`login submit: ${JSON.stringify(login)}`);
  }
  await page.close();

  page = await openPage("/projects");
  await page.locator("li button", { hasText: "Edit" }).first().click();
  const save = await page
    .locator('form[aria-label^="Edit"] button[type="submit"]')
    .evaluate(read);
  if (JSON.stringify(save) !== JSON.stringify({ padV: "8px", padH: "16px", size: "14px", weight: "600" })) {
    offenders.push(`projects edit save: ${JSON.stringify(save)}`);
  }
  await page.close();

  assert.deepEqual(offenders, [], `primary buttons off the dominant recipe: ${offenders.join("; ")}`);
} finally {
  await browser.close();
}
console.log("UA-017 green");
