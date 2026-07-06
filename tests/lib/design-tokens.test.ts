// Design-system conformance (DESIGN.md): the warm-paper tokens exist with
// their specified values, the dark space theme is gone, and no component
// still speaks the legacy token vocabulary.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECT_PALETTE } from "@/lib/palette";

const ROOT = process.cwd();
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(full);
  }
  return out;
}

describe("globals.css tokens", () => {
  it.each([
    ["--paper", "oklch(0.972 0.008 95)"],
    ["--surface", "oklch(0.995 0.004 95)"],
    ["--surface-sunken", "oklch(0.945 0.01 95)"],
    ["--ink", "oklch(0.27 0.012 80)"],
    ["--border", "oklch(0.9 0.008 95)"],
    ["--frog-green", "oklch(0.62 0.13 148)"],
    ["--frog-green-strong", "oklch(0.54 0.13 148)"],
    ["--frog-green-soft", "oklch(0.93 0.045 148)"],
    ["--on-green", "oklch(0.99 0.004 95)"],
    ["--log-brown", "oklch(0.5 0.06 60)"],
    ["--heat-0", "oklch(0.93 0.006 95)"],
    ["--heat-1", "oklch(0.85 0.05 148)"],
    ["--heat-2", "oklch(0.72 0.1 148)"],
    ["--heat-3", "oklch(0.6 0.14 148)"],
  ])("declares %s as %s", (name, value) => {
    expect(css).toContain(`${name}: ${value};`);
  });

  it("is a light theme with no starfield and no pure black or white", () => {
    expect(css).toContain("color-scheme: light;");
    expect(css).not.toMatch(/radial-gradient/);
    expect(css).not.toMatch(/#070a13/i);
    expect(css).not.toMatch(/#fff\b|#ffffff/i);
    expect(css).not.toMatch(/#000\b|#000000/i);
  });
});

describe("legacy token vocabulary is retired", () => {
  const legacy = [
    "bg-panel",
    "border-line",
    "divide-line",
    "text-muted",
    "text-faint",
    "text-foreground",
    "bg-accent",
    "text-accent",
    "text-success",
    "var(--accent)",
    "var(--muted)",
    "var(--faint)",
  ];
  const files = [...sourceFiles(join(ROOT, "app")), ...sourceFiles(join(ROOT, "components"))];

  it("finds no legacy class or var in app/ and components/", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      for (const token of legacy) {
        if (body.includes(token)) offenders.push(`${file}: ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("project palette", () => {
  it("is ten unique hex colors", () => {
    expect(PROJECT_PALETTE).toHaveLength(10);
    expect(new Set(PROJECT_PALETTE.map((c) => c.toLowerCase())).size).toBe(10);
    for (const c of PROJECT_PALETTE) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("no longer contains the dark-theme space palette", () => {
    const space = ["#7c8cf8", "#c084fc", "#67e8f9", "#fbbf24", "#f472b6"];
    for (const old of space) {
      expect(PROJECT_PALETTE.map((c) => c.toLowerCase())).not.toContain(old);
    }
  });
});
