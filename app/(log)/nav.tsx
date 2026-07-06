"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Log" },
  { href: "/monthly", label: "Monthly" },
  { href: "/projects", label: "Projects" },
  { href: "/settings", label: "Settings" },
];

// Quiet top nav (DESIGN.md): sans labels in ink-muted, the active item in ink
// with a frog-green underline. No boxed chrome, no pills. Desktop only; on
// phones navigation moves to the thumb-reachable <TabBar/> below.
export function LogNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-4 md:flex">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative px-0.5 py-1.5 text-sm transition-colors ${
              active
                ? "font-medium text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-frog-green"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// 8-bit tab icons on an 11x11 pixel grid, same visual language as Ferdy:
// currentColor rects, crisp edges. '.' = empty, 'X' = filled.
const ICONS: Record<string, readonly string[]> = {
  // Log: the contribution heatmap, the page's signature.
  "/": [
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "...........",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "...........",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
  ],
  // Monthly: ascending bars.
  "/monthly": [
    "...........",
    "........XXX",
    "........XXX",
    "........XXX",
    "....XXX.XXX",
    "....XXX.XXX",
    "....XXX.XXX",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
    "XXX.XXX.XXX",
  ],
  // Projects: an outline folder.
  "/projects": [
    "...........",
    "...........",
    "XXXX.......",
    "XXXXXXXXXXX",
    "X.........X",
    "X.........X",
    "X.........X",
    "X.........X",
    "X.........X",
    "XXXXXXXXXXX",
    "...........",
  ],
  // Settings: a pixel gear.
  "/settings": [
    "....XXX....",
    ".X..XXX..X.",
    ".XXXXXXXXX.",
    "..XXX.XXX..",
    "XXXX...XXXX",
    "XXXX...XXXX",
    "XXXX...XXXX",
    "..XXX.XXX..",
    ".XXXXXXXXX.",
    ".X..XXX..X.",
    "....XXX....",
  ],
};

function PixelIcon({ grid }: { grid: readonly string[] }) {
  const rects: Array<{ x: number; y: number; w: number }> = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "X") {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === "X") end += 1;
      rects.push({ x, y, w: end - x });
      x = end;
    }
  });
  return (
    <svg
      viewBox="0 0 11 11"
      width={20}
      height={20}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="pixel-art"
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

// Thumb-reachable bottom tab bar for phones (ADR-0015): the four routes as
// labelled >=44px targets on paper with a hairline top border. The active tab
// is ink with a frog-green bar under its icon (never green alone); inactive
// tabs are ink-muted. Hidden from md up, where the quiet top nav takes over.
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-paper pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                <PixelIcon grid={ICONS[href]} />
                <span className={`text-[11px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                  {label}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-5 rounded-full ${active ? "bg-frog-green" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
