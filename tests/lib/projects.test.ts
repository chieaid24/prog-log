import { describe, expect, it } from "vitest";
import { assignProjectColor, PROJECT_PALETTE } from "@/lib/palette";
import {
  findNearMatches,
  findNearMatchesWithAliases,
  resolveProject,
  resolveProjectWithAliases,
} from "@/lib/projects";
import type { Project, ProjectAlias } from "@/lib/types";

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

function alias(text: string, projectId: string, id = `al-${text}`): ProjectAlias {
  return {
    id,
    user_id: "u1",
    project_id: projectId,
    alias: text,
    created_at: "2026-01-01T00:00:00Z",
  };
}

const ALIASES = [alias("aim", "ai-m"), alias("mental health", "ai-m"), alias("tr", "turkish")];

describe("resolveProjectWithAliases (ADR-0010)", () => {
  it("resolves an alias to its project, case-insensitively", () => {
    const r = resolveProjectWithAliases(CANDIDATES, ALIASES, " AIM ");
    expect(r.status).toBe("match");
    if (r.status === "match") expect(r.project.name).toBe("AI-M");
  });

  it("still resolves plain names when no alias matches", () => {
    const r = resolveProjectWithAliases(CANDIDATES, ALIASES, "mandarin");
    expect(r.status).toBe("match");
    if (r.status === "match") expect(r.project.name).toBe("Mandarin");
  });

  it("collapses a name hit and an alias hit on the same project into a match", () => {
    // Alias "turkish" on the Turkish project itself: one distinct project.
    const withSelfAlias = [...ALIASES, alias("turkish", "turkish", "al-self")];
    const r = resolveProjectWithAliases(CANDIDATES, withSelfAlias, "Turkish");
    expect(r.status).toBe("match");
    if (r.status === "match") expect(r.project.name).toBe("Turkish");
  });

  it("flags ambiguity when an alias collides with a different project's name", () => {
    // "mandarin" is Mandarin's name and (perversely) an alias of Work.
    const withCollision = [...ALIASES, alias("mandarin", "work", "al-collide")];
    const r = resolveProjectWithAliases(CANDIDATES, withCollision, "mandarin");
    expect(r.status).toBe("ambiguous");
    if (r.status === "ambiguous")
      expect(r.near.map((p) => p.name).sort()).toEqual(["Mandarin", "Work"]);
  });

  it("ignores aliases pointing at projects outside the candidates (archived)", () => {
    const r = resolveProjectWithAliases(CANDIDATES, [alias("ghost", "not-a-candidate")], "ghost");
    expect(r).toEqual({ status: "none", near: [] });
  });

  it("feeds alias substring hits into the near-match hints, deduped", () => {
    const r = resolveProjectWithAliases(CANDIDATES, ALIASES, "mental");
    expect(r.status).toBe("none");
    if (r.status === "none") expect(r.near.map((p) => p.name)).toEqual(["AI-M"]);
  });
});

describe("findNearMatchesWithAliases", () => {
  it("keeps name-based hints first and dedupes alias hits on the same project", () => {
    // "m" substring-hits AI-M and Mandarin by name and "mental health" by alias.
    const near = findNearMatchesWithAliases(CANDIDATES, ALIASES, "m");
    const names = near.map((p) => p.name);
    expect(names.filter((n) => n === "AI-M")).toHaveLength(1);
    expect(names).toContain("Mandarin");
  });

  it("returns nothing for empty input", () => {
    expect(findNearMatchesWithAliases(CANDIDATES, ALIASES, " ")).toEqual([]);
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
