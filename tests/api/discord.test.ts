// Request tests for the Discord interactions endpoint (PRD 4.1): real
// tweetnacl keypair for the signature, mocked admin client + owner fetches,
// spied upsertEntry and set_reflection rpc — asserting the route never
// writes on any rejection path.
import nacl from "tweetnacl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, ProjectAlias } from "@/lib/types";

const { ADMIN, rpc, upsertEntry, getOwnerActiveProjects, getOwnerAliases } = vi.hoisted(() => {
  const rpc = vi.fn();
  return {
    ADMIN: { admin: true, rpc },
    rpc,
    upsertEntry: vi.fn(),
    getOwnerActiveProjects: vi.fn(),
    getOwnerAliases: vi.fn(),
  };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ADMIN }));
vi.mock("@/lib/entries", () => ({ upsertEntry }));
vi.mock("@/lib/discord/owner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discord/owner")>();
  return { ...actual, getOwnerActiveProjects, getOwnerAliases };
});

import { POST } from "@/app/api/discord/route";

const keyPair = nacl.sign.keyPair();
const wrongKeyPair = nacl.sign.keyPair();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const PUBLIC_KEY = toHex(keyPair.publicKey);
const OWNER_DISCORD_ID = "228591234567890123";
const OWNER_USER_ID = "11111111-1111-1111-1111-111111111111";
const TS = "1720000000";

/** Signed POST to the route; `secretKey` swaps in a forger's key. */
function post(
  payload: unknown,
  { secretKey = keyPair.secretKey, headers = true } = {},
): Promise<Response> {
  const body = JSON.stringify(payload);
  const signature = toHex(
    nacl.sign.detached(new TextEncoder().encode(TS + body), secretKey),
  );
  return POST(
    new Request("http://localhost/api/discord", {
      method: "POST",
      headers: headers
        ? { "x-signature-ed25519": signature, "x-signature-timestamp": TS }
        : {},
      body,
    }),
  );
}

function project(name: string): Project {
  return {
    id: `id-${name.toLowerCase()}`,
    user_id: OWNER_USER_ID,
    name,
    category: null,
    status: "active",
    color: "#7c8cf8",
    started: null,
    description: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

const PROJECTS = [project("AI-M"), project("Turkish"), project("Work")];

function aliasRow(text: string, projectId: string): ProjectAlias {
  return {
    id: `al-${text}`,
    user_id: OWNER_USER_ID,
    project_id: projectId,
    alias: text,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function logCommand(
  options: Record<string, string>,
  userId: string = OWNER_DISCORD_ID,
) {
  return {
    type: 2,
    member: { user: { id: userId } },
    data: {
      name: "log",
      options: Object.entries(options).map(([name, value]) => ({ name, value })),
    },
  };
}

function autocomplete(typed: string, userId: string = OWNER_DISCORD_ID) {
  return {
    type: 4,
    member: { user: { id: userId } },
    data: {
      name: "log",
      options: [{ name: "project", value: typed, focused: true }],
    },
  };
}

function reflectCommand(
  options: Record<string, string>,
  userId: string = OWNER_DISCORD_ID,
) {
  return {
    type: 2,
    member: { user: { id: userId } },
    data: {
      name: "reflect",
      options: Object.entries(options).map(([name, value]) => ({ name, value })),
    },
  };
}

function expeditionCommand(
  options: Record<string, string>,
  userId: string = OWNER_DISCORD_ID,
) {
  return {
    type: 2,
    member: { user: { id: userId } },
    data: {
      name: "expedition",
      options: Object.entries(options).map(([name, value]) => ({ name, value })),
    },
  };
}

const EXPEDITION_ROW = {
  id: "exp-1",
  user_id: OWNER_USER_ID,
  title: "how do black holes evaporate",
  description: null,
  status: "open",
  position: 4,
  youtube_url: null,
  youtube_video_id: null,
  youtube_title: null,
  answered_at: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

const REFLECTION_ROW = {
  user_id: OWNER_USER_ID,
  entry_date: "2026-07-29",
  reflection: "shipped the reflect command",
  created_at: "2026-07-29T00:00:00Z",
  updated_at: "2026-07-29T00:00:00Z",
};

beforeEach(() => {
  vi.stubEnv("DISCORD_PUBLIC_KEY", PUBLIC_KEY);
  vi.stubEnv("DISCORD_OWNER_ID", OWNER_DISCORD_ID);
  vi.stubEnv("OWNER_USER_ID", OWNER_USER_ID);
  upsertEntry.mockReset().mockResolvedValue({});
  rpc.mockReset().mockResolvedValue({ data: REFLECTION_ROW, error: null });
  getOwnerActiveProjects.mockReset().mockResolvedValue(PROJECTS);
  getOwnerAliases.mockReset().mockResolvedValue([]);
});

describe("DEMO_MODE (ADR-0016)", () => {
  it("no-ops with the demo sentinel before any signature or write, even for a valid /log", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    try {
      const res = await post(logCommand({ project: "Work", time: "small" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: false, demo: true });
      expect(upsertEntry).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("signature check", () => {
  it("401s a signature from the wrong key, without writing", async () => {
    const res = await post({ type: 1 }, { secretKey: wrongKeyPair.secretKey });
    expect(res.status).toBe(401);
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("401s missing signature headers", async () => {
    const res = await post({ type: 1 }, { headers: false });
    expect(res.status).toBe(401);
  });

  it("401s a tampered body", async () => {
    const body = JSON.stringify({ type: 1 });
    const signature = toHex(
      nacl.sign.detached(new TextEncoder().encode(TS + body), keyPair.secretKey),
    );
    const res = await POST(
      new Request("http://localhost/api/discord", {
        method: "POST",
        headers: { "x-signature-ed25519": signature, "x-signature-timestamp": TS },
        body: JSON.stringify({ type: 2 }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("ping", () => {
  it("answers PING with PONG", async () => {
    const res = await post({ type: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: 1 });
  });
});

describe("owner gate", () => {
  it("rejects a non-owner command with an ephemeral message and no write", async () => {
    const res = await post(logCommand({ project: "Work", time: "medium" }, "999"));
    expect(await res.json()).toEqual({
      type: 4,
      data: { content: "not authorized", flags: 64 },
    });
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("gives a non-owner empty autocomplete", async () => {
    const res = await post(autocomplete("wo", "999"));
    expect(await res.json()).toEqual({ type: 8, data: { choices: [] } });
    expect(getOwnerActiveProjects).not.toHaveBeenCalled();
  });
});

describe("autocomplete", () => {
  it("filters active Projects by the typed prefix", async () => {
    const res = await post(autocomplete("tur"));
    expect(await res.json()).toEqual({
      type: 8,
      data: { choices: [{ name: "Turkish", value: "Turkish" }] },
    });
  });

  it("offers every active Project when nothing is typed", async () => {
    const res = await post(autocomplete(""));
    const json = await res.json();
    expect(json.data.choices.map((c: { name: string }) => c.name)).toEqual([
      "AI-M",
      "Turkish",
      "Work",
    ]);
  });

  it("caps choices at 25", async () => {
    getOwnerActiveProjects.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => project(`Project ${String(i).padStart(2, "0")}`)),
    );
    const res = await post(autocomplete("project"));
    const json = await res.json();
    expect(json.data.choices).toHaveLength(25);
  });

  it("surfaces an alias hit under the canonical project name (ADR-0010)", async () => {
    getOwnerAliases.mockResolvedValue([aliasRow("mental health", "id-ai-m")]);
    const res = await post(autocomplete("mental"));
    expect(await res.json()).toEqual({
      type: 8,
      data: { choices: [{ name: "AI-M", value: "AI-M" }] },
    });
  });
});

describe("/log via alias (ADR-0010)", () => {
  it("resolves an alias and confirms with the canonical name", async () => {
    getOwnerAliases.mockResolvedValue([aliasRow("aim", "id-ai-m")]);
    const res = await post(logCommand({ project: "aim", time: "large" }));
    expect(upsertEntry).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ projectId: "id-ai-m", timeSpent: "large" }),
    );
    const json = await res.json();
    expect(json.data.content).toContain("logged AI-M - large");
  });

  it("stays ambiguous when an alias collides with another project's name", async () => {
    getOwnerAliases.mockResolvedValue([aliasRow("work", "id-turkish")]);
    const res = await post(logCommand({ project: "work", time: "small" }));
    const json = await res.json();
    expect(json.data.content).toContain("no single active project matches");
    expect(upsertEntry).not.toHaveBeenCalled();
  });
});

describe("/log command", () => {
  it("resolves an exact case-insensitive match and upserts as the owner", async () => {
    const res = await post(
      logCommand({ project: "work", time: "medium", milestone: "shipped the digest" }),
    );
    expect(upsertEntry).toHaveBeenCalledTimes(1);
    expect(upsertEntry).toHaveBeenCalledWith(ADMIN, {
      projectId: "id-work",
      timeSpent: "medium",
      milestone: "shipped the digest",
      description: null,
      userId: OWNER_USER_ID,
    });
    const json = await res.json();
    expect(json.type).toBe(4);
    expect(json.data.flags).toBe(64);
    expect(json.data.content).toContain("logged Work - medium");
  });

  it("rejects an unresolvable project with a did-you-mean hint and no write", async () => {
    const res = await post(logCommand({ project: "turk", time: "small" }));
    const json = await res.json();
    expect(json.data.content).toBe(
      'no single active project matches "turk". did you mean: Turkish?',
    );
    expect(json.data.flags).toBe(64);
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  it("rejects an invalid time value with no write", async () => {
    const res = await post(logCommand({ project: "Work", time: "huge" }));
    const json = await res.json();
    expect(json.data.content).toContain('"huge" is not a time commitment');
    expect(upsertEntry).not.toHaveBeenCalled();
  });
});

describe("/reflect command", () => {
  it("401s a bad signature without writing", async () => {
    const res = await post(reflectCommand({ reflection: "a good day" }), {
      secretKey: wrongKeyPair.secretKey,
    });
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a non-owner with an ephemeral message and no write", async () => {
    const res = await post(reflectCommand({ reflection: "a good day" }, "999"));
    expect(await res.json()).toEqual({
      type: 4,
      data: { content: "not authorized", flags: 64 },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("upserts today's reflection via set_reflection as the owner", async () => {
    const res = await post(reflectCommand({ reflection: "  shipped the reflect command  " }));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("set_reflection", {
      p_reflection: "shipped the reflect command",
      p_user: OWNER_USER_ID,
    });
    const json = await res.json();
    expect(json.type).toBe(4);
    expect(json.data.flags).toBe(64);
    expect(json.data.content).toBe("reflection saved for 2026-07-29");
  });

  it("passes an explicit date through to set_reflection", async () => {
    await post(reflectCommand({ reflection: "backfilled", date: "2026-07-01" }));
    expect(rpc).toHaveBeenCalledWith("set_reflection", {
      p_reflection: "backfilled",
      p_user: OWNER_USER_ID,
      p_date: "2026-07-01",
    });
  });

  it("rejects a malformed date with no write", async () => {
    const res = await post(reflectCommand({ reflection: "typo day", date: "july 1" }));
    const json = await res.json();
    expect(json.data.content).toBe('"july 1" is not a date - use YYYY-MM-DD.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an empty reflection with no write", async () => {
    const res = await post(reflectCommand({ reflection: "   " }));
    const json = await res.json();
    expect(json.data.content).toBe("write a line first.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("replies with a save failure when the rpc errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await post(reflectCommand({ reflection: "a good day" }));
    const json = await res.json();
    expect(json.data.content).toBe("could not save the reflection - try again.");
  });
});

describe("/expedition command", () => {
  beforeEach(() => {
    rpc.mockResolvedValue({ data: EXPEDITION_ROW, error: null });
  });

  it("401s a bad signature without writing", async () => {
    const res = await post(expeditionCommand({ title: "black holes" }), {
      secretKey: wrongKeyPair.secretKey,
    });
    expect(res.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a non-owner with an ephemeral message and no write", async () => {
    const res = await post(expeditionCommand({ title: "black holes" }, "999"));
    expect(await res.json()).toEqual({
      type: 4,
      data: { content: "not authorized", flags: 64 },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("no-ops with the demo sentinel in DEMO_MODE, without writing (ADR-0016)", async () => {
    vi.stubEnv("DEMO_MODE", "1");
    try {
      const res = await post(expeditionCommand({ title: "black holes" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: false, demo: true });
      expect(rpc).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("appends through add_expedition as the owner and confirms ephemerally", async () => {
    const res = await post(
      expeditionCommand({ title: "  how do black holes evaporate  " }),
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("add_expedition", {
      p_title: "how do black holes evaporate",
      p_description: null,
      p_user: OWNER_USER_ID,
    });
    const json = await res.json();
    expect(json.type).toBe(4);
    expect(json.data.flags).toBe(64);
    expect(json.data.content).toBe("expedition added: how do black holes evaporate");
  });

  it("passes an optional description through to add_expedition", async () => {
    await post(
      expeditionCommand({ title: "hawking radiation", description: "start with the paradox" }),
    );
    expect(rpc).toHaveBeenCalledWith("add_expedition", {
      p_title: "hawking radiation",
      p_description: "start with the paradox",
      p_user: OWNER_USER_ID,
    });
  });

  it("rejects an empty title with no write", async () => {
    const res = await post(expeditionCommand({ title: "   " }));
    const json = await res.json();
    expect(json.data.content).toBe("write a topic first.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("replies with a save failure when the rpc errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await post(expeditionCommand({ title: "black holes" }));
    const json = await res.json();
    expect(json.data.content).toBe("could not add the expedition - try again.");
  });
});

describe("unknown command", () => {
  it("replies unknown without writing", async () => {
    const res = await post({
      type: 2,
      member: { user: { id: OWNER_DISCORD_ID } },
      data: { name: "frobnicate", options: [] },
    });
    const json = await res.json();
    expect(json.data.content).toBe("unknown command");
    expect(upsertEntry).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
