// Ferdy: the 8-bit frog on a log (DESIGN.md "The Frog"). One pixel sprite,
// rendered as crisp SVG rects off design tokens, so he recolors with the
// theme. Decorative next to text (default, aria-hidden); standalone with a
// `title`. His idle blink lives in globals.css (.frog-eyes) and is fully
// disabled under prefers-reduced-motion.

const COLS = 16;

// '.' = transparent. G body, Y belly, W eye white, K pupil, B log, U bark.
const SPRITE = [
  "...GG......GG...",
  "..GWWG....GWWG..",
  "..GWKG....GWKG..",
  "..GGGGGGGGGGGG..",
  ".GGGGGGGGGGGGGG.",
  ".GGGGGGGGGGGGGG.",
  ".GGYYYYYYYYYYGG.",
  ".GGYYYYYYYYYYGG.",
  "GGGGYYYYYYYYGGGG",
  "GG.GGGGGGGGGG.GG",
  "BBBBBBBBBBBBBBBB",
  "BUBBBBUBBBBBUBBB",
  "BBBBUBBBBBUBBBBB",
  ".UUUUUUUUUUUUUU.",
] as const;

const ROWS = SPRITE.length;

const FILL: Record<string, string> = {
  G: "var(--frog-green)",
  Y: "var(--frog-green-soft)",
  W: "var(--on-green)",
  K: "var(--ink)",
  B: "var(--log-brown)",
  // Bark shading, a darker log-brown; mascot art only, never a UI color.
  U: "oklch(0.4 0.055 55)",
};

type Run = { x: number; y: number; w: number; fill: string };

/** Merge horizontal runs of same-colored pixels into single rects. */
function toRuns(remap: (ch: string) => string): Run[] {
  const runs: Run[] = [];
  SPRITE.forEach((row, y) => {
    let x = 0;
    while (x < COLS) {
      const ch = remap(row[x]);
      if (ch === ".") {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < COLS && remap(row[end]) === ch) end += 1;
      runs.push({ x, y, w: end - x, fill: FILL[ch] });
      x = end;
    }
  });
  return runs;
}

// Base sprite paints the eyes as plain body green (the "eyelids"); the eye
// layer overlays whites and pupils and is what blinks away.
const BASE = toRuns((ch) => (ch === "W" || ch === "K" ? "G" : ch));
const EYES = toRuns((ch) => (ch === "W" || ch === "K" ? ch : "."));

type Props = {
  /** Rendered width in px; height follows the sprite's pixel grid. */
  size?: number;
  /** Short alt for a standalone frog; omit when he sits beside real text. */
  title?: string;
  className?: string;
};

export function Frog({ size = 32, title, className }: Props) {
  return (
    <svg
      viewBox={`0 0 ${COLS} ${ROWS}`}
      width={size}
      height={Math.round((size * ROWS) / COLS)}
      shapeRendering="crispEdges"
      className={className ? `pixel-art ${className}` : "pixel-art"}
      data-testid="frog"
      {...(title ? { role: "img" } : { "aria-hidden": true })}
    >
      {title ? <title>{title}</title> : null}
      {BASE.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
      <g className="frog-eyes">
        {EYES.map((r) => (
          <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
      </g>
    </svg>
  );
}
