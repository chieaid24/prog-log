// setReflectionAction (ADR-0017): validates input, then writes through the
// set_reflection RPC — the single write path shared with Discord capture.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { setReflectionAction } from "@/app/actions/reflections";

const ROW = {
  user_id: "u1",
  entry_date: "2026-07-29",
  reflection: "shipped the reflection flow",
  created_at: "2026-07-29T00:00:00Z",
  updated_at: "2026-07-29T00:00:00Z",
};

function clientWithRpc(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  createClient.mockResolvedValue({ rpc });
  return rpc;
}

beforeEach(() => {
  createClient.mockReset();
  revalidatePath.mockReset();
});

describe("setReflectionAction", () => {
  it("rejects an empty reflection without touching the database", async () => {
    const result = await setReflectionAction({ reflection: "   " });
    expect(result).toEqual({ ok: false, error: "Write a line first." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a malformed date without touching the database", async () => {
    const result = await setReflectionAction({ reflection: "fine", entryDate: "07/29/2026" });
    expect(result).toEqual({ ok: false, error: "Invalid date." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("trims and upserts today's reflection via the RPC (no explicit date)", async () => {
    const rpc = clientWithRpc({ data: ROW, error: null });

    const result = await setReflectionAction({ reflection: "  shipped the reflection flow  " });

    expect(rpc).toHaveBeenCalledWith("set_reflection", {
      p_reflection: "shipped the reflection flow",
      p_date: undefined,
    });
    expect(result).toEqual({ ok: true, reflection: ROW });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("passes an explicit past day through to the RPC", async () => {
    const rpc = clientWithRpc({ data: { ...ROW, entry_date: "2026-06-14" }, error: null });

    const result = await setReflectionAction({ reflection: "past day", entryDate: "2026-06-14" });

    expect(rpc).toHaveBeenCalledWith("set_reflection", {
      p_reflection: "past day",
      p_date: "2026-06-14",
    });
    expect(result).toMatchObject({ ok: true });
  });

  it("surfaces an RPC failure as an error result", async () => {
    clientWithRpc({ data: null, error: new Error("permission denied") });

    const result = await setReflectionAction({ reflection: "will fail" });

    expect(result).toEqual({ ok: false, error: "permission denied" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
