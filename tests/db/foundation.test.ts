import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { asUser, connectAdmin, createUser, SEED_USER } from "./helpers";

let admin: Client;

beforeAll(async () => {
  admin = await connectAdmin();
});

afterAll(async () => {
  await admin.end();
});

describe("migrations", () => {
  it("created the core tables and the time_size enum in ascending order", async () => {
    const tables = await admin.query(
      `select table_name from information_schema.tables
       where table_schema = 'public'
       order by table_name`,
    );
    const names = tables.rows.map((r) => r.table_name);
    expect(names).toContain("projects");
    expect(names).toContain("entries");
    expect(names).toContain("app_settings");

    // ADR-0001: greatest() on time_spent depends on this exact declaration order.
    const enumOrder = await admin.query(
      `select enumlabel from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'time_size'
       order by e.enumsortorder`,
    );
    expect(enumOrder.rows.map((r) => r.enumlabel)).toEqual(["small", "medium", "large"]);
  });

  it("seeded exactly 5 active starter projects for the dev user", async () => {
    const res = await admin.query(
      "select name, status, color from projects where user_id = $1 order by name",
      [SEED_USER],
    );
    expect(res.rows).toHaveLength(5);
    expect(res.rows.every((r) => r.status === "active")).toBe(true);
    expect(res.rows.every((r) => typeof r.color === "string" && r.color.length > 0)).toBe(true);
    expect(res.rows.map((r) => r.name)).toEqual([
      "AI-M",
      "Mandarin",
      "Turkish",
      "Website",
      "Work",
    ]);
  });
});

describe("entry grain (ADR-0001)", () => {
  it("rejects a duplicate (user, project, day) with a unique violation", async () => {
    const user = await createUser(admin);
    const project = await admin.query(
      "insert into projects (user_id, name) values ($1, 'Dup Test') returning id",
      [user],
    );
    const insert = `insert into entries (user_id, project_id, entry_date, time_spent)
                    values ($1, $2, '2026-01-15', 'small')`;
    await admin.query(insert, [user, project.rows[0].id]);
    await expect(admin.query(insert, [user, project.rows[0].id])).rejects.toMatchObject({
      code: "23505", // unique_violation
    });
  });
});

describe("row level security", () => {
  it("hides one user's projects and entries from another", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);

    await asUser(admin, alice, async () => {
      const p = await admin.query(
        "insert into projects (name) values ('Alice Secret') returning id",
      );
      await admin.query("select log_entry($1, 'medium')", [p.rows[0].id]);
    });

    await asUser(admin, bob, async () => {
      const projects = await admin.query("select * from projects");
      const entries = await admin.query("select * from entries");
      expect(projects.rows).toHaveLength(0);
      expect(entries.rows).toHaveLength(0);
    });

    await asUser(admin, alice, async () => {
      const projects = await admin.query("select * from projects");
      expect(projects.rows).toHaveLength(1);
    });
  });

  it("blocks an authenticated user from writing an entry as someone else", async () => {
    const mallory = await createUser(admin);
    const victim = await createUser(admin);
    const victimProject = await admin.query(
      "insert into projects (user_id, name) values ($1, 'Victim Project') returning id",
      [victim],
    );

    await asUser(admin, mallory, async () => {
      await expect(
        admin.query("select log_entry($1, 'small', null, null, $2)", [
          victimProject.rows[0].id,
          victim,
        ]),
      ).rejects.toMatchObject({ code: "42501" }); // insufficient_privilege (RLS)
    });
  });
});

describe("log_entry accumulate semantics (ADR-0001)", () => {
  async function setupProject() {
    const user = await createUser(admin);
    const project = await admin.query(
      "insert into projects (user_id, name) values ($1, 'Accumulate') returning id",
      [user],
    );
    return { user, projectId: project.rows[0].id as string };
  }

  it("keeps the peak time commitment when re-logged lower", async () => {
    const { user, projectId } = await setupProject();
    await admin.query("select log_entry($1, 'large', null, null, $2)", [projectId, user]);
    const after = await admin.query(
      "select (log_entry($1, 'small', null, null, $2)).time_spent",
      [projectId, user],
    );
    expect(after.rows[0].time_spent).toBe("large");
  });

  it("upgrades the time commitment when re-logged higher", async () => {
    const { user, projectId } = await setupProject();
    await admin.query("select log_entry($1, 'small', null, null, $2)", [projectId, user]);
    const after = await admin.query(
      "select (log_entry($1, 'medium', null, null, $2)).time_spent",
      [projectId, user],
    );
    expect(after.rows[0].time_spent).toBe("medium");
  });

  it("never erases an existing milestone or description on a bare re-log", async () => {
    const { user, projectId } = await setupProject();
    await admin.query("select log_entry($1, 'medium', 'shipped v1', 'long detail', $2)", [
      projectId,
      user,
    ]);
    const after = await admin.query(
      `select (r).milestone, (r).description, (r).time_spent
       from log_entry($1, 'small', null, null, $2) r`,
      [projectId, user],
    );
    expect(after.rows[0].milestone).toBe("shipped v1");
    expect(after.rows[0].description).toBe("long detail");
    expect(after.rows[0].time_spent).toBe("medium");
  });

  it("keeps exactly one row per (project, day) across repeated logs", async () => {
    const { user, projectId } = await setupProject();
    for (const t of ["small", "medium", "small"]) {
      await admin.query(`select log_entry($1, $2::time_size, null, null, $3)`, [
        projectId,
        t,
        user,
      ]);
    }
    const count = await admin.query(
      "select count(*)::int as n from entries where user_id = $1 and project_id = $2",
      [user, projectId],
    );
    expect(count.rows[0].n).toBe(1);
  });
});

describe("timezone resolution (ADR-0004)", () => {
  it("stamps entry_date as today in the user's stored timezone", async () => {
    const user = await createUser(admin);
    // UTC+14: the earliest timezone on Earth — most likely to differ from UTC.
    await admin.query(
      "insert into app_settings (user_id, timezone) values ($1, 'Pacific/Kiritimati')",
      [user],
    );
    const project = await admin.query(
      "insert into projects (user_id, name) values ($1, 'TZ Test') returning id",
      [user],
    );
    const res = await admin.query(
      `select (log_entry($1, 'small', null, null, $2)).entry_date::text as got,
              ((now() at time zone 'Pacific/Kiritimati')::date)::text as want`,
      [project.rows[0].id, user],
    );
    expect(res.rows[0].got).toBe(res.rows[0].want);
  });

  it("falls back to America/Toronto when no settings row exists", async () => {
    const user = await createUser(admin);
    const project = await admin.query(
      "insert into projects (user_id, name) values ($1, 'TZ Fallback') returning id",
      [user],
    );
    const res = await admin.query(
      `select (log_entry($1, 'small', null, null, $2)).entry_date::text as got,
              ((now() at time zone 'America/Toronto')::date)::text as want`,
      [project.rows[0].id, user],
    );
    expect(res.rows[0].got).toBe(res.rows[0].want);
  });
});

describe("log_entry explicit date (migration 3)", () => {
  it("logs onto the supplied past day instead of today", async () => {
    const user = await createUser(admin);
    const project = await admin.query(
      "insert into projects (user_id, name) values ($1, 'Backfill') returning id",
      [user],
    );
    const res = await admin.query(
      `select (log_entry($1, 'medium', null, null, $2, '2026-01-10'::date)).entry_date::text as d`,
      [project.rows[0].id, user],
    );
    expect(res.rows[0].d).toBe("2026-01-10");
  });

  it("accumulates into an existing row on the explicit day", async () => {
    const user = await createUser(admin);
    const project = await admin.query(
      "insert into projects (user_id, name) values ($1, 'Backfill2') returning id",
      [user],
    );
    await admin.query(
      "select log_entry($1, 'large', 'shipped', null, $2, '2026-01-10'::date)",
      [project.rows[0].id, user],
    );
    const res = await admin.query(
      `select (r).time_spent, (r).milestone from log_entry($1, 'small', null, null, $2, '2026-01-10'::date) r`,
      [project.rows[0].id, user],
    );
    expect(res.rows[0].time_spent).toBe("large");
    expect(res.rows[0].milestone).toBe("shipped");
    const count = await admin.query(
      "select count(*)::int as n from entries where user_id = $1",
      [user],
    );
    expect(count.rows[0].n).toBe(1);
  });
});
