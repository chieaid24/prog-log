// Project identity palette: ten muted colors that read as small dots on the
// warm paper canvas (DESIGN.md). Deliberately skips the frog-green band
// (~hue 130-170) so project identity never competes with the one accent.
// Values are sRGB hex renderings of oklch picks (L 0.60-0.70, C 0.09-0.13).
// Every Project gets a color at create (glossary: never null); users can
// override later.

export const PROJECT_PALETTE: readonly string[] = [
  "#bd6254", // clay        oklch(0.60 0.12 30)
  "#ca7d44", // terracotta  oklch(0.66 0.12 55)
  "#be9946", // ochre       oklch(0.70 0.11 85)
  "#87904e", // olive       oklch(0.63 0.09 115)
  "#339797", // teal        oklch(0.62 0.09 195)
  "#4796c0", // sky         oklch(0.64 0.10 235)
  "#6d7ac2", // periwinkle  oklch(0.60 0.11 275)
  "#906eb5", // violet      oklch(0.60 0.11 305)
  "#af6ca0", // orchid      oklch(0.62 0.11 335)
  "#bf5b76", // raspberry   oklch(0.60 0.13 5)
];

/**
 * Pick the least-used palette color given the colors already in use; earliest
 * palette position wins ties, so assignment is stable and cycles cleanly once
 * every color is taken.
 */
export function assignProjectColor(colorsInUse: readonly (string | null)[]): string {
  const counts = new Map<string, number>();
  for (const c of colorsInUse) {
    if (c) counts.set(c.toLowerCase(), (counts.get(c.toLowerCase()) ?? 0) + 1);
  }
  let best = PROJECT_PALETTE[0];
  let bestCount = Infinity;
  for (const color of PROJECT_PALETTE) {
    const n = counts.get(color.toLowerCase()) ?? 0;
    if (n < bestCount) {
      best = color;
      bestCount = n;
    }
  }
  return best;
}
