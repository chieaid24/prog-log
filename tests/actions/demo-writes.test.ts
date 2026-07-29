// DEMO_MODE (ADR-0016): every write server action becomes a no-op that never
// touches Supabase and returns the "demo, not saved" sentinel. createClient is
// a spy asserted un-called, so a leaked write would fail loudly; revalidatePath
// staying un-called proves nothing was persisted.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { importEntriesAction } from "@/app/actions/data";
import { deleteEntryAction, logEntryAction } from "@/app/actions/entries";
import {
  addProjectAliasAction,
  createProjectAction,
  removeProjectAliasAction,
  setProjectStatusAction,
  updateProjectAction,
} from "@/app/actions/projects";
import { setReflectionAction } from "@/app/actions/reflections";
import { updateTimezoneAction } from "@/app/actions/settings";
import { DEMO_WRITE_NOTE } from "@/lib/demo/mode";

const SENTINEL = { ok: false, demo: true, error: DEMO_WRITE_NOTE };

beforeEach(() => {
  vi.stubEnv("DEMO_MODE", "1");
  createClient.mockReset().mockImplementation(() => {
    throw new Error("Supabase must not be created in DEMO_MODE");
  });
  revalidatePath.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Each write path, and a call that would otherwise write. */
const cases: Array<[string, () => Promise<unknown>]> = [
  ["logEntryAction", () => logEntryAction({ projectId: "p1", timeSpent: "small" })],
  ["deleteEntryAction", () => deleteEntryAction("e1")],
  ["createProjectAction", () => createProjectAction({ name: "Rocketry" })],
  ["setProjectStatusAction", () => setProjectStatusAction("p1", "archived")],
  ["updateProjectAction", () => updateProjectAction("p1", { name: "Renamed" })],
  ["addProjectAliasAction", () => addProjectAliasAction("p1", "rk")],
  ["removeProjectAliasAction", () => removeProjectAliasAction("a1")],
  ["updateTimezoneAction", () => updateTimezoneAction("America/Toronto")],
  ["setReflectionAction", () => setReflectionAction({ reflection: "a line" })],
  ["importEntriesAction", () => importEntriesAction(importForm())],
];

function importForm(): FormData {
  const fd = new FormData();
  fd.append(
    "file",
    new File(["entry_date,project,time_spent,milestone,description\r\n2026-07-01,alpha,small,,\r\n"], "export.csv", {
      type: "text/csv",
    }),
  );
  return fd;
}

describe("write actions in DEMO_MODE return the sentinel and never touch the database", () => {
  it.each(cases)("%s no-ops with the demo sentinel", async (_name, call) => {
    const result = await call();
    expect(result).toEqual(SENTINEL);
    expect(createClient).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("outside DEMO_MODE the guard is inert", () => {
  it("logEntryAction still validates its input (no early demo return)", async () => {
    vi.stubEnv("DEMO_MODE", "");
    const result = await logEntryAction({ projectId: "", timeSpent: "small" });
    expect(result).toEqual({ ok: false, error: "Pick a project." });
    expect(createClient).not.toHaveBeenCalled();
  });
});
