// Project accent palette — a "space" set that reads on the app's dark canvas.
// Every Project gets a color at create (glossary: never null); users can
// override later.

export const PROJECT_PALETTE: readonly string[] = [
  "#7c8cf8", // indigo drift
  "#c084fc", // nebula violet
  "#67e8f9", // ion cyan
  "#fbbf24", // solar amber
  "#f472b6", // plasma pink
  "#34d399", // aurora green
  "#fb923c", // mars orange
  "#a3e635", // comet lime
  "#38bdf8", // sky signal
  "#f87171", // red giant
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
