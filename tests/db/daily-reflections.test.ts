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

describe("daily_reflections migration (ADR-0017)", () => {
  it("created the day-level table keyed on (user, day)", async () => {
    const cols = await admin.query(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'daily_reflections'
       order by column_name`,
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual([
      "created_at",
      "entry_date",
      "reflection",
      "updated_at",
      "user_id",
    ]);

    const pk = await admin.query(
      `select a.attname from pg_index i
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
       where i.indrelid = 'public.daily_reflections'::regclass and i.indisprimary
       order by a.attname`,
    );
    expect(pk.rows.map((r) => r.attname)).toEqual(["entry_date", "user_id"]);
  });

  it("enabled row level security with an owner policy", async () => {
    const rls = await admin.query(
      "select relrowsecurity from pg_class where oid = 'public.daily_reflections'::regclass",
    );
    expect(rls.rows[0].relrowsecurity).toBe(true);

    const policy = await admin.query(
      "select polname from pg_policy where polrelid = 'public.daily_reflections'::regclass",
    );
    expect(policy.rows.map((r) => r.polname)).toContain("own reflections");
  });

  it("granted the DML the PostgREST roles need (ADR-0012)", async () => {
    const grants = await admin.query(
      `select grantee, privilege_type from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'daily_reflections'
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
});

describe("set_reflection upsert semantics (ADR-0017)", () => {
  it("inserts then overwrites the same (user, day) row", async () => {
    const user = await createUser(admin);
    const first = await admin.query(
      "select (set_reflection($1, $2)).* ",
      ["proud of shipping the parser", user],
    );
    expect(first.rows[0].reflection).toBe("proud of shipping the parser");
    const createdAt = first.rows[0].created_at;

    const second = await admin.query(
      "select (set_reflection($1, $2)).* ",
      ["actually, proud of the tests", user],
    );
    expect(second.rows[0].reflection).toBe("actually, proud of the tests");
    // Same row: created_at is preserved across the overwrite.
    expect(second.rows[0].created_at).toEqual(createdAt);

    const count = await admin.query(
      "select count(*)::int as n from daily_reflections where user_id = $1",
      [user],
    );
    expect(count.rows[0].n).toBe(1);
  });

  it("keeps one row per day while touching updated_at on overwrite", async () => {
    const user = await createUser(admin);
    await admin.query("select set_reflection($1, $2, '2026-03-01'::date)", ["v1", user]);
    const after = await admin.query(
      `select (r).reflection, (r).created_at, (r).updated_at
       from set_reflection($1, $2, '2026-03-01'::date) r`,
      ["v2", user],
    );
    expect(after.rows[0].reflection).toBe("v2");
    expect(new Date(after.rows[0].updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(after.rows[0].created_at).getTime(),
    );
  });

  it("logs onto an explicit past day instead of today", async () => {
    const user = await createUser(admin);
    const res = await admin.query(
      "select (set_reflection($1, $2, '2026-01-10'::date)).entry_date::text as d",
      ["backfilled reflection", user],
    );
    expect(res.rows[0].d).toBe("2026-01-10");
  });

  it("stamps today in the user's stored timezone by default (ADR-0004)", async () => {
    const user = await createUser(admin);
    await admin.query(
      "insert into app_settings (user_id, timezone) values ($1, 'Pacific/Kiritimati')",
      [user],
    );
    const res = await admin.query(
      `select (set_reflection($1, $2)).entry_date::text as got,
              ((now() at time zone 'Pacific/Kiritimati')::date)::text as want`,
      ["tz reflection", user],
    );
    expect(res.rows[0].got).toBe(res.rows[0].want);
  });

  it("falls back to America/Toronto when no settings row exists", async () => {
    const user = await createUser(admin);
    const res = await admin.query(
      `select (set_reflection($1, $2)).entry_date::text as got,
              ((now() at time zone 'America/Toronto')::date)::text as want`,
      ["fallback reflection", user],
    );
    expect(res.rows[0].got).toBe(res.rows[0].want);
  });
});

describe("daily_reflections row level security", () => {
  it("hides one user's reflections from another", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);

    await asUser(admin, alice, async () => {
      await admin.query("select set_reflection($1)", ["alice's private day"]);
    });

    await asUser(admin, bob, async () => {
      const seen = await admin.query("select * from daily_reflections");
      expect(seen.rows).toHaveLength(0);
    });

    await asUser(admin, alice, async () => {
      const seen = await admin.query("select * from daily_reflections");
      expect(seen.rows).toHaveLength(1);
      expect(seen.rows[0].reflection).toBe("alice's private day");
    });
  });

  it("blocks an authenticated user from writing a reflection as someone else", async () => {
    const mallory = await createUser(admin);
    const victim = await createUser(admin);

    await asUser(admin, mallory, async () => {
      await expect(
        admin.query("select set_reflection($1, $2)", ["not mine to write", victim]),
      ).rejects.toMatchObject({ code: "42501" }); // insufficient_privilege (RLS)
    });
  });
});
