// UA-008: keyboard focus must not change an element's own corner radius.
// The global :focus-visible rule forced border-radius to 4px app-wide
// (8px inputs and the circular log button snapped square on focus). Red
// while a focused control's radius differs from its at-rest radius.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: false });
try {
  const page = await openPage("/login");
  // The email input is autofocused (which counts as :focus-visible), so
  // blur first to read the true at-rest radius.
  const atRest = await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    return getComputedStyle(document.querySelector("#email")).borderRadius;
  });
  let focused = null;
  for (let i = 0; i < 10 && !focused?.active; i++) {
    await page.keyboard.press("Tab");
    focused = await page.evaluate(() => {
      const el = document.querySelector("#email");
      return {
        active: document.activeElement === el && el.matches(":focus-visible"),
        radius: getComputedStyle(el).borderRadius,
      };
    });
  }
  assert.ok(focused?.active, "email input never received keyboard (:focus-visible) focus");
  assert.equal(
    focused.radius,
    atRest,
    `focus changes the element's radius: at rest ${atRest}, focused ${focused.radius}`,
  );
} finally {
  await browser.close();
}
console.log("UA-008 green");
