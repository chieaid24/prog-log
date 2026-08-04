// The answer flow's server-side gate (ADR-0019): an invalid link is rejected
// before any database call, and an oEmbed failure still stores the id with a
// null title so the showcase can fall back to the raw link.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { addExpeditionAction, answerExpeditionAction } from "@/app/actions/expeditions";

const ID = "dQw4w9WgXcQ";

beforeEach(() => {
  vi.stubEnv("DEMO_MODE", "");
  createClient.mockReset();
  revalidatePath.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("answerExpeditionAction", () => {
  it("rejects a non-YouTube link before touching the database", async () => {
    const result = await answerExpeditionAction("x1", "https://vimeo.com/123456");
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: expect.stringContaining("YouTube") });
    expect(createClient).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an empty link", async () => {
    const result = await answerExpeditionAction("x1", "   ");
    expect(result).toEqual({ ok: false, error: "Paste the YouTube link first." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("stores the parsed id with a null title when oEmbed fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("oembed down")));
    const rpc = vi.fn().mockResolvedValue({ data: { id: "x1" }, error: null });
    createClient.mockResolvedValue({ rpc });

    const url = `https://www.youtube.com/watch?v=${ID}`;
    const result = await answerExpeditionAction("x1", url);
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("answer_expedition", {
      p_id: "x1",
      p_url: url,
      p_video_id: ID,
      p_title: null,
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("stores the oEmbed title when the lookup succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: "A real title" }))),
    );
    const rpc = vi.fn().mockResolvedValue({ data: { id: "x1" }, error: null });
    createClient.mockResolvedValue({ rpc });

    const result = await answerExpeditionAction("x1", `https://youtu.be/${ID}`);
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      "answer_expedition",
      expect.objectContaining({ p_video_id: ID, p_title: "A real title" }),
    );
  });
});

describe("addExpeditionAction", () => {
  it("rejects a blank title before touching the database", async () => {
    const result = await addExpeditionAction({ title: "   " });
    expect(result).toEqual({ ok: false, error: "Write a title first." });
    expect(createClient).not.toHaveBeenCalled();
  });
});
