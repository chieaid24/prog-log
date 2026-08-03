import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { asUser, connectAdmin, createUser } from "./helpers";

let admin: Client;

beforeAll(async () => {
  admin = await connectAdmin();
});

afterAll(async () => {
  await admin.end();
});

// `select * from f(...)` evaluates once; `select (f(...)).* ` expands per
// output column and would re-run this volatile insert 12 times.
async function addExpedition(
  user: string,
  title: string,
  description: string | null = null,
) {
  const res = await admin.query(
    "select * from add_expedition($1, $2, $3)",
    [title, description, user],
  );
  return res.rows[0];
}

describe("expeditions migration (ADR-0018)", () => {
  it("created the table with the expedition_status enum in todo-first order", async () => {
    const cols = await admin.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'expeditions'
       order by column_name`,
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual([
      "answered_at",
      "created_at",
      "description",
      "id",
      "position",
      "status",
      "title",
      "updated_at",
      "user_id",
      "youtube_title",
      "youtube_url",
      "youtube_video_id",
    ]);

    const enumOrder = await admin.query(
      `select enumlabel from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'expedition_status'
       order by e.enumsortorder`,
    );
    expect(enumOrder.rows.map((r) => r.enumlabel)).toEqual(["open", "answered"]);
  });

  it("enabled row level security with an owner policy", async () => {
    const rls = await admin.query(
      "select relrowsecurity from pg_class where oid = 'public.expeditions'::regclass",
    );
    expect(rls.rows[0].relrowsecurity).toBe(true);

    const policy = await admin.query(
      "select polname from pg_policy where polrelid = 'public.expeditions'::regclass",
    );
    expect(policy.rows.map((r) => r.polname)).toContain("own expeditions");
  });

  it("granted the DML the PostgREST roles need (ADR-0012)", async () => {
    const grants = await admin.query(
      `select grantee, privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'expeditions'
         and grantee in ('authenticated', 'service_role')`,
    );
    for (const role of ["authenticated", "service_role"]) {
      const held = grants.rows
        .filter((r) => r.grantee === role)
        .map((r) => r.privilege_type)
        .sort();
      expect(held).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);
    }
  });

  it("granted execute on all six write RPCs to both API roles", async () => {
    const fns = [
      "add_expedition(text, text, uuid)",
      "reorder_expeditions(uuid[], uuid)",
      "answer_expedition(uuid, text, text, text, uuid)",
      "reopen_expedition(uuid, uuid)",
      "update_expedition(uuid, text, text, uuid)",
      "delete_expedition(uuid, uuid)",
    ];
    for (const fn of fns) {
      for (const role of ["authenticated", "service_role"]) {
        const res = await admin.query(
          "select has_function_privilege($1, $2, 'execute') as ok",
          [role, `public.${fn}`],
        );
        expect(res.rows[0].ok, `${role} on ${fn}`).toBe(true);
      }
    }
  });
});

describe("add_expedition append semantics (ADR-0018)", () => {
  it("inserts open items at the bottom, positions ascending", async () => {
    const user = await createUser(admin);
    const first = await addExpedition(user, "why is the sky blue", "rayleigh scattering");
    const second = await addExpedition(user, "how does raft elect a leader");
    const third = await addExpedition(user, "what is a bloom filter");

    expect(first.status).toBe("open");
    expect(first.title).toBe("why is the sky blue");
    expect(first.description).toBe("rayleigh scattering");
    expect(second.description).toBeNull();
    expect([first.position, second.position, third.position]).toEqual([1, 2, 3]);
    expect(first.answered_at).toBeNull();
    expect(first.youtube_url).toBeNull();
  });

  it("rejects a blank title via the table check constraint", async () => {
    const user = await createUser(admin);
    await expect(addExpedition(user, "   ")).rejects.toMatchObject({
      code: "23514", // check_violation
    });
  });

  it("keeps per-user position sequences independent", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    await addExpedition(alice, "alice one");
    await addExpedition(alice, "alice two");
    const bobFirst = await addExpedition(bob, "bob one");
    expect(bobFirst.position).toBe(1);
  });
});

describe("answer_expedition (ADR-0018)", () => {
  it("stores the link fields and stamps status + answered_at", async () => {
    const user = await createUser(admin);
    const row = await addExpedition(user, "explain wal replay");
    const res = await admin.query(
      "select * from answer_expedition($1, $2, $3, $4, $5)",
      [row.id, "https://youtu.be/abc123", "abc123", "WAL replay explained", user],
    );
    const answered = res.rows[0];
    expect(answered.status).toBe("answered");
    expect(answered.answered_at).not.toBeNull();
    expect(answered.youtube_url).toBe("https://youtu.be/abc123");
    expect(answered.youtube_video_id).toBe("abc123");
    expect(answered.youtube_title).toBe("WAL replay explained");
  });

  it("rejects an empty, blank, or missing url without writing", async () => {
    const user = await createUser(admin);
    const row = await addExpedition(user, "link required");
    for (const badUrl of ["", "   ", null]) {
      await expect(
        admin.query("select answer_expedition($1, $2, $3, $4, $5)", [
          row.id,
          badUrl,
          null,
          null,
          user,
        ]),
      ).rejects.toMatchObject({ code: "22023" }); // invalid_parameter_value
    }
    const unchanged = await admin.query(
      "select status, answered_at from expeditions where id = $1",
      [row.id],
    );
    expect(unchanged.rows[0].status).toBe("open");
    expect(unchanged.rows[0].answered_at).toBeNull();
  });
});

describe("reopen_expedition (ADR-0018)", () => {
  it("returns the row to the todo bottom, keeps the link, clears answered_at", async () => {
    const user = await createUser(admin);
    const target = await addExpedition(user, "reopen me");
    await addExpedition(user, "still open");
    await admin.query("select answer_expedition($1, $2, $3, $4, $5)", [
      target.id,
      "https://youtu.be/keep1",
      "keep1",
      "kept title",
      user,
    ]);

    const res = await admin.query("select * from reopen_expedition($1, $2)", [
      target.id,
      user,
    ]);
    const reopened = res.rows[0];
    expect(reopened.status).toBe("open");
    expect(reopened.answered_at).toBeNull();
    expect(reopened.youtube_url).toBe("https://youtu.be/keep1");
    expect(reopened.youtube_video_id).toBe("keep1");
    expect(reopened.youtube_title).toBe("kept title");

    const maxOther = await admin.query(
      "select max(position)::int as m from expeditions where user_id = $1 and id <> $2",
      [user, target.id],
    );
    expect(reopened.position).toBeGreaterThan(maxOther.rows[0].m);
  });
});

describe("reorder_expeditions (ADR-0018)", () => {
  it("applies the ordered id array as 1-based positions", async () => {
    const user = await createUser(admin);
    const a = await addExpedition(user, "a");
    const b = await addExpedition(user, "b");
    const c = await addExpedition(user, "c");

    await admin.query("select reorder_expeditions($1, $2)", [
      [c.id, a.id, b.id],
      user,
    ]);

    const order = await admin.query(
      `select title from expeditions where user_id = $1 and status = 'open'
       order by position`,
      [user],
    );
    expect(order.rows.map((r) => r.title)).toEqual(["c", "a", "b"]);
  });
});

describe("update_expedition and delete_expedition (ADR-0018)", () => {
  it("edits the text and bumps updated_at", async () => {
    const user = await createUser(admin);
    const row = await addExpedition(user, "draft title", "draft description");
    const res = await admin.query(
      "select * from update_expedition($1, $2, $3, $4)",
      [row.id, "final title", "final description", user],
    );
    const updated = res.rows[0];
    expect(updated.title).toBe("final title");
    expect(updated.description).toBe("final description");
    expect(updated.created_at).toEqual(row.created_at);
    expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(updated.created_at).getTime(),
    );
  });

  it("removes the row on delete", async () => {
    const user = await createUser(admin);
    const row = await addExpedition(user, "short-lived");
    await admin.query("select delete_expedition($1, $2)", [row.id, user]);
    const left = await admin.query(
      "select count(*)::int as n from expeditions where id = $1",
      [row.id],
    );
    expect(left.rows[0].n).toBe(0);
  });
});

describe("expeditions row level security", () => {
  it("hides one user's expeditions from another", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);

    await asUser(admin, alice, async () => {
      await admin.query("select add_expedition($1)", ["alice's private topic"]);
    });

    await asUser(admin, bob, async () => {
      const seen = await admin.query("select * from expeditions");
      expect(seen.rows).toHaveLength(0);
    });

    await asUser(admin, alice, async () => {
      const seen = await admin.query("select * from expeditions");
      expect(seen.rows).toHaveLength(1);
      expect(seen.rows[0].title).toBe("alice's private topic");
    });
  });

  it("blocks an authenticated user from adding an expedition as someone else", async () => {
    const mallory = await createUser(admin);
    const victim = await createUser(admin);

    await asUser(admin, mallory, async () => {
      await expect(
        admin.query("select add_expedition($1, null, $2)", ["not mine", victim]),
      ).rejects.toMatchObject({ code: "42501" }); // insufficient_privilege (RLS)
    });
  });

  it("makes cross-user answer attempts a no-op (RLS hides the row)", async () => {
    const mallory = await createUser(admin);
    const victim = await createUser(admin);
    const row = await addExpedition(victim, "victim's topic");

    await asUser(admin, mallory, async () => {
      const res = await admin.query("select * from answer_expedition($1, $2)", [
        row.id,
        "https://youtu.be/steal",
      ]);
      // RLS hides the row: the update matches nothing and returns no data.
      expect(res.rows[0].id).toBeNull();
    });

    const untouched = await admin.query(
      "select status, youtube_url from expeditions where id = $1",
      [row.id],
    );
    expect(untouched.rows[0].status).toBe("open");
    expect(untouched.rows[0].youtube_url).toBeNull();
  });
});
