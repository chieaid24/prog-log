import { describe, expect, it } from "vitest";
import { assignProjectColor, PROJECT_PALETTE } from "@/lib/palette";
import { findNearMatches, resolveProject } from "@/lib/projects";
import type { Project } from "@/lib/types";

function project(name: string, id = name.toLowerCase()): Project {
  return {
    id,
    user_id: "u1",
    name,
    category: null,
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

const CANDIDATES = [project("Work"), project("AI-M"), project("Turkish"), project("Mandarin")];

describe("resolveProject (never guesses, PRD 4.1)", () => {
  it("matches exactly, case-insensitively, ignoring surrounding whitespace", () => {
    const r = resolveProject(CANDIDATES, "  ai-m ");
    expect(r.status).toBe("match");
    if (r.status === "match") expect(r.project.name).toBe("AI-M");
  });

  it("refuses to resolve a partial name, offering near matches", () => {
    const r = resolveProject(CANDIDATES, "man");
    expect(r.status).toBe("none");
    if (r.status === "none") expect(r.near.map((p) => p.name)).toEqual(["Mandarin"]);
  });

  it("returns none with no hints for garbage input", () => {
    const r = resolveProject(CANDIDATES, "xyzzy");
    expect(r).toEqual({ status: "none", near: [] });
  });

  it("flags ambiguity instead of picking among duplicates", () => {
    const dupes = [...CANDIDATES, project("work", "other-id")];
    const r = resolveProject(dupes, "WORK");
    expect(r.status).toBe("ambiguous");
    if (r.status === "ambiguous") expect(r.near).toHaveLength(2);
  });
});

describe("findNearMatches", () => {
  it("matches in both containment directions", () => {
    expect(findNearMatches(CANDIDATES, "turk").map((p) => p.name)).toEqual(["Turkish"]);
    expect(findNearMatches(CANDIDATES, "turkish lessons").map((p) => p.name)).toEqual([
      "Turkish",
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(findNearMatches(CANDIDATES, "  ")).toEqual([]);
  });
});

describe("assignProjectColor", () => {
  it("assigns the first palette color to the first project", () => {
    expect(assignProjectColor([])).toBe(PROJECT_PALETTE[0]);
  });

  it("avoids colors already in use until the palette is exhausted", () => {
    const used = PROJECT_PALETTE.slice(0, 3);
    expect(assignProjectColor(used)).toBe(PROJECT_PALETTE[3]);
  });

  it("cycles to least-used once every color is taken", () => {
    const used = [...PROJECT_PALETTE, PROJECT_PALETTE[0]];
    expect(assignProjectColor(used)).toBe(PROJECT_PALETTE[1]);
  });

  it("ignores nulls and is case-insensitive", () => {
    expect(assignProjectColor([null, PROJECT_PALETTE[0].toUpperCase()])).toBe(
      PROJECT_PALETTE[1],
    );
  });
});
