import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { inject } from "vitest";

/** Superuser connection — stands in for the service-role key (bypasses RLS). */
export async function connectAdmin(): Promise<Client> {
  const client = new Client({ connectionString: inject("dbUrl") });
  await client.connect();
  return client;
}

/** Create a throwaway auth user and return its id. */
export async function createUser(admin: Client): Promise<string> {
  const id = randomUUID();
  await admin.query("insert into auth.users (id, email) values ($1, $2)", [
    id,
    `${id}@test.local`,
  ]);
  return id;
}

/**
 * Run queries as an RLS-constrained `authenticated` session for the given
 * user, mirroring how PostgREST executes browser requests. Resets the role
 * afterwards.
 */
export async function asUser<T>(
  client: Client,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await client.query("set role authenticated");
  try {
    return await fn();
  } finally {
    await client.query("reset role");
    await client.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

export const SEED_USER = "00000000-0000-0000-0000-000000000001";
