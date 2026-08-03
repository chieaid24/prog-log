import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { deleteProjectAction } from "@/app/actions/projects";

function clientWithDelete(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ single }));
  const byStatus = vi.fn(() => ({ select }));
  const byId = vi.fn(() => ({ eq: byStatus }));
  const deleteRows = vi.fn(() => ({ eq: byId }));
  const from = vi.fn(() => ({ delete: deleteRows }));
  createClient.mockResolvedValue({ from });
  return { from, byId, byStatus };
}

beforeEach(() => {
  createClient.mockReset();
  revalidatePath.mockReset();
});

describe("deleteProjectAction", () => {
  it("deletes an archived Project and refreshes every derived view", async () => {
    const query = clientWithDelete({ data: { id: "p1" }, error: null });

    const result = await deleteProjectAction("p1");

    expect(result).toEqual({ ok: true });
    expect(query.from).toHaveBeenCalledWith("projects");
    expect(query.byId).toHaveBeenCalledWith("id", "p1");
    expect(query.byStatus).toHaveBeenCalledWith("status", "archived");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns a delete failure without refreshing derived views", async () => {
    clientWithDelete({ data: null, error: new Error("Project must be archived.") });

    const result = await deleteProjectAction("p1");

    expect(result).toEqual({ ok: false, error: "Project must be archived." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
