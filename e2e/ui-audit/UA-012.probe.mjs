// UA-012: a frog sitting beside equivalent text is decorative and must be
// aria-hidden with no accessible name (DESIGN.md frog a11y rule; matches
// the wordmark and login usages). Red while /now or the 404 page announce
// the frog with role=img + title.
import assert from "node:assert/strict";
import { launch } from "./support/page-context.mjs";

const { browser, openPage } = await launch("desktop", { authed: true });
try {
  const offenders = [];
  for (const route of ["/now", "/this-route-does-not-exist"]) {
    const page = await openPage(route);
    const state = await page.evaluate(() => {
      const frog = document.querySelector('[data-testid="frog"]');
      if (!frog) return null;
      return {
        ariaHidden: frog.getAttribute("aria-hidden"),
        hasTitle: !!frog.querySelector("title"),
      };
    });
    if (!state) offenders.push(`${route}: frog missing`);
    else if (state.ariaHidden !== "true" || state.hasTitle) {
      offenders.push(`${route}: aria-hidden=${state.ariaHidden}, title=${state.hasTitle}`);
    }
    await page.close();
  }
  assert.deepEqual(offenders, [], `frogs announced beside equivalent text: ${offenders.join("; ")}`);
} finally {
  await browser.close();
}
console.log("UA-012 green");
