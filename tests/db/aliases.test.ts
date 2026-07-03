// project_aliases schema behavior (ADR-0010): per-user case-insensitive
// uniqueness enforced by the DB, RLS isolation identical to projects.
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

async function projectFor(user: string, name: string): Promise<string> {
  const res = await admin.query(
    "insert into projects (user_id, name) values ($1, $2) returning id",
    [user, name],
  );
  return res.rows[0].id;
}

describe("project_aliases", () => {
  it("seeded the AI-M example aliases", async () => {
    const res = await admin.query(
      `select a.alias from project_aliases a
       join projects p on p.id = a.project_id
       where a.user_id = $1 and p.name = 'AI-M' order by a.alias`,
      [SEED_USER],
    );
    expect(res.rows.map((r) => r.alias)).toEqual(["aim", "mental health"]);
  });

  it("rejects the same alias twice for one user, case-insensitively", async () => {
    const user = await createUser(admin);
    const p1 = await projectFor(user, "Alias P1");
    const p2 = await projectFor(user, "Alias P2");
    await admin.query(
      "insert into project_aliases (user_id, project_id, alias) values ($1, $2, 'mh')",
      [user, p1],
    );
    // Same alias, different casing, even pointing at another project: rejected.
    await expect(
      admin.query(
        "insert into project_aliases (user_id, project_id, alias) values ($1, $2, 'MH')",
        [user, p2],
      ),
    ).rejects.toMatchObject({ code: "23505" }); // unique_violation
  });

  it("allows the same alias for different users", async () => {
    const a = await createUser(admin);
    const b = await createUser(admin);
    const pa = await projectFor(a, "Shared Name A");
    const pb = await projectFor(b, "Shared Name B");
    await admin.query(
      "insert into project_aliases (user_id, project_id, alias) values ($1, $2, 'shared')",
      [a, pa],
    );
    await expect(
      admin.query(
        "insert into project_aliases (user_id, project_id, alias) values ($1, $2, 'shared')",
        [b, pb],
      ),
    ).resolves.toBeTruthy();
  });

  it("rejects blank aliases", async () => {
    const user = await createUser(admin);
    const p = await projectFor(user, "Blank Alias");
    await expect(
      admin.query(
        "insert into project_aliases (user_id, project_id, alias) values ($1, $2, '  ')",
        [user, p],
      ),
    ).rejects.toMatchObject({ code: "23514" }); // check_violation
  });

  it("hides one user's aliases from another (RLS)", async () => {
    const alice = await createUser(admin);
    const bob = await createUser(admin);

    await asUser(admin, alice, async () => {
      const p = await admin.query(
        "insert into projects (name) values ('Alias Secret') returning id",
      );
      await admin.query(
        "insert into project_aliases (project_id, alias) values ($1, 'secret-alias')",
        [p.rows[0].id],
      );
    });

    await asUser(admin, bob, async () => {
      const res = await admin.query("select * from project_aliases");
      expect(res.rows).toHaveLength(0);
    });

    await asUser(admin, alice, async () => {
      const res = await admin.query("select alias from project_aliases");
      expect(res.rows.map((r) => r.alias)).toEqual(["secret-alias"]);
    });
  });
});
