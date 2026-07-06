"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * True on touch-primary devices. SSR (and the first client render) report
 * false so hydration stays consistent; touch devices re-render once after
 * mount. Used where touch needs geometry CSS can't reach, e.g. sizing the
 * heatmap's SVG cells up to a tappable size.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
