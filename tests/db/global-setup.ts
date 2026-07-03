import EmbeddedPostgres from "embedded-postgres";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dbUrl: string;
  }
}

/**
 * Boots one embedded Postgres 17 for the whole test run, applies the Supabase
 * auth shim, every migration in supabase/migrations (sorted, same order the
 * Supabase CLI uses), and the seed. Table grants come from the migrations
 * themselves. Tests receive the connection string via inject("dbUrl").
 */
export default async function setup(project: TestProject) {
  const dataDir = mkdtempSync(path.join(tmpdir(), "prog-log-pg-"));
  const port = await freePort();

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("prog_log_test");

  const dbUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/prog_log_test`;
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const root = path.resolve(__dirname, "../..");
    await client.query(readFileSync(path.join(root, "tests/db/auth-shim.sql"), "utf8"));

    const migrationsDir = path.join(root, "supabase/migrations");
    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
      await client.query(readFileSync(path.join(migrationsDir, file), "utf8"));
    }

    // No extra grants here: the role_grants migration carries the real
    // table privileges, and the tests exercise exactly those.
    await client.query(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  } finally {
    await client.end();
  }

  project.provide("dbUrl", dbUrl);

  return async () => {
    await pg.stop();
    rmSync(dataDir, { recursive: true, force: true });
  };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (address && typeof address === "object") {
        const p = address.port;
        srv.close(() => resolve(p));
      } else {
        srv.close(() => reject(new Error("could not allocate a free port")));
      }
    });
  });
}
