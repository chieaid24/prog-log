// Runs every ui-audit probe (UA-*.probe.mjs) against the dev server and the
// deterministic mock backend. Each probe asserts one visual rule from a
// ui-audit finding; a probe exits non-zero while its finding stands.
//
// Usage (from the repo root):
//   node e2e/ui-audit/support/mock-supabase.mjs &          # backend fixture
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54999 \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon \
//   SUPABASE_SERVICE_ROLE_KEY=mock-service \
//   OWNER_USER_ID=f0000000-0000-4000-8000-000000000001 \
//   npx next dev -p 3111 &                                 # app under test
//   node e2e/ui-audit/run-probes.mjs [UA-001 ...]          # all or selected
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const DIR = dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const probes = readdirSync(DIR)
  .filter((f) => /^UA-\d{3}.*\.probe\.mjs$/.test(f))
  .filter((f) => only.length === 0 || only.some((id) => f.startsWith(id)))
  .sort();

if (probes.length === 0) {
  console.log("no probes matched");
  process.exit(0);
}

let failed = 0;
for (const probe of probes) {
  const r = spawnSync("node", [join(DIR, probe)], { stdio: "inherit" });
  if (r.status === 0) {
    console.log(`GREEN ${probe}`);
  } else {
    console.error(`RED   ${probe}`);
    failed++;
  }
}
console.log(`\n${probes.length - failed}/${probes.length} probes green`);
process.exit(failed > 0 ? 1 : 0);
