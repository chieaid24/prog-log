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

async function createProjectFixture(userId: string, name: string, status: "active" | "archived") {
  const project = await admin.query(
    "insert into projects (user_id, name, status) values ($1, $2, $3) returning id",
    [userId, name, status],
  );
  const projectId = project.rows[0].id as string;
  const entry = await admin.query(
    `insert into entries (user_id, project_id, entry_date, time_spent)
     values ($1, $2, '2026-08-01', 'medium') returning id`,
    [userId, projectId],
  );
  const alias = await admin.query(
    "insert into project_aliases (user_id, project_id, alias) values ($1, $2, $3) returning id",
    [userId, projectId, `${name.toLowerCase()}-alias`],
  );
  return {
    projectId,
    entryId: entry.rows[0].id as string,
    aliasId: alias.rows[0].id as string,
  };
}

async function countById(table: string, id: string): Promise<number> {
  const result = await admin.query(`select count(*)::int as n from ${table} where id = $1`, [id]);
  return result.rows[0].n as number;
}

describe("archived Project deletion", () => {
  it("cascades Project-scoped rows while preserving reflections and other users' data", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const target = await createProjectFixture(alice, "Delete Target", "archived");
    const active = await createProjectFixture(alice, "Keep Active", "active");
    const otherOwner = await createProjectFixture(bob, "Keep Other Owner", "archived");

    await admin.query(
      `insert into daily_reflections (user_id, entry_date, reflection)
       values ($1, '2026-08-01', 'Alice reflection'), ($2, '2026-08-01', 'Bob reflection')`,
      [alice, bob],
    );

    await asUser(admin, alice, async () => {
      const denied = await admin.query(
        "delete from projects where id = $1 and status = 'archived' returning id",
        [otherOwner.projectId],
      );
      expect(denied.rowCount).toBe(0);

      const keptActive = await admin.query(
        "delete from projects where id = $1 and status = 'archived' returning id",
        [active.projectId],
      );
      expect(keptActive.rowCount).toBe(0);

      const deleted = await admin.query(
        "delete from projects where id = $1 and status = 'archived' returning id",
        [target.projectId],
      );
      expect(deleted.rows).toEqual([{ id: target.projectId }]);
    });

    expect(await countById("projects", target.projectId)).toBe(0);
    expect(await countById("entries", target.entryId)).toBe(0);
    expect(await countById("project_aliases", target.aliasId)).toBe(0);

    expect(await countById("projects", active.projectId)).toBe(1);
    expect(await countById("entries", active.entryId)).toBe(1);
    expect(await countById("project_aliases", active.aliasId)).toBe(1);
    expect(await countById("projects", otherOwner.projectId)).toBe(1);
    expect(await countById("entries", otherOwner.entryId)).toBe(1);
    expect(await countById("project_aliases", otherOwner.aliasId)).toBe(1);

    const reflections = await admin.query(
      "select user_id from daily_reflections where user_id in ($1, $2) order by user_id",
      [alice, bob],
    );
    expect(reflections.rows.map((row) => row.user_id).sort()).toEqual([alice, bob].sort());
  });
});
