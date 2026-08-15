// Deterministic Supabase stand-in for browser-driven UI checks (ui-audit).
// Serves the GoTrue and PostgREST subset the app reads from, over a fixed
// fixture dataset, so screenshots and probes see identical bytes on every
// run and never depend on the live project being awake.
//
//   node e2e/ui-audit/support/mock-supabase.mjs [port]     (default 54999)
//
// Point the dev server at it:
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54999 \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon \
//   SUPABASE_SERVICE_ROLE_KEY=mock-service \
//   OWNER_USER_ID=f0000000-0000-4000-8000-000000000001 \
//   npx next dev -p 3111
//
// Read-only: POST/PATCH/DELETE against /rest/v1 return 405.
import { createServer } from "node:http";
import { createHmac } from "node:crypto";

const PORT = Number(process.argv[2] ?? 54999);
export const OWNER = "f0000000-0000-4000-8000-000000000001";
const EMAIL = "owner@example.test";
const TZ = "America/Toronto";

// --- deterministic helpers ---------------------------------------------

function hash(s) {
  // djb2: stable across runs and platforms.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function uuidFrom(s) {
  const a = hash("a:" + s).toString(16).padStart(8, "0");
  const b = hash("b:" + s).toString(16).padStart(8, "0");
  const c = hash("c:" + s).toString(16).padStart(8, "0");
  const d = hash("d:" + s).toString(16).padStart(8, "0");
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-8${c.slice(1, 4)}-${c.slice(4)}${d.slice(0, 4)}`;
}

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// --- fixture ------------------------------------------------------------

const TODAY = todayISO();

const projectDefs = [
  { name: "prog-log", category: "code", color: "#bd6254", status: "active" },
  { name: "AI-M", category: "research", color: "#339797", status: "active" },
  { name: "Thesis", category: "writing", color: "#6d7ac2", status: "active" },
  { name: "Climbing", category: "health", color: "#be9946", status: "active" },
  { name: "youtube-buddy", category: "code", color: "#bf5b76", status: "archived" },
];

const projects = projectDefs.map((p) => ({
  id: uuidFrom("project:" + p.name),
  user_id: OWNER,
  name: p.name,
  category: p.category,
  status: p.status,
  color: p.color,
  started: addDays(TODAY, -400),
  description: null,
  created_at: `${addDays(TODAY, -400)}T12:00:00+00:00`,
}));

const entries = [];
const byDayProject = new Map();

function putEntry(day, project, time_spent, milestone, description) {
  const key = `${day}|${project.id}`;
  const row = {
    id: uuidFrom("entry:" + key),
    user_id: OWNER,
    project_id: project.id,
    entry_date: day,
    time_spent,
    milestone: milestone ?? null,
    description: description ?? null,
    created_at: `${day}T12:00:00+00:00`,
  };
  if (byDayProject.has(key)) {
    entries[byDayProject.get(key)] = row;
  } else {
    byDayProject.set(key, entries.length);
    entries.push(row);
  }
}

// ~420 days of pseudo-random history over the active projects, mirroring
// scripts/dev-data.sql: ~45% of (day, project) slots filled, sizes skewed
// small, the odd milestone, deterministic for a given TODAY.
const active = projects.filter((p) => p.status === "active");
for (let i = 420; i >= 0; i--) {
  const day = addDays(TODAY, -i);
  for (const p of active) {
    const roll = hash(day + "|" + p.name) % 100;
    if (roll < 45) {
      const size = roll < 8 ? "large" : roll < 25 ? "medium" : "small";
      putEntry(
        day,
        p,
        size,
        roll === 7 ? `shipped a chunk of ${p.name}` : null,
        roll % 3 === 0 ? `worked on ${p.name}` : null,
      );
    }
  }
}

// A live streak so the momentum card has a current run.
for (let i = 5; i >= 0; i--) {
  putEntry(addDays(TODAY, -i), active[1], "medium", null, "daily research block");
}

// Throwback anchors exactly 1 month and 1 year back.
putEntry(addDays(TODAY, -31), active[0], "large", "launched the monthly breakdown", null);
const yearAgo = `${Number(TODAY.slice(0, 4)) - 1}${TODAY.slice(4)}`;
putEntry(yearAgo, active[2], "large", "finished the thesis proposal draft", null);

const app_settings = [{ user_id: OWNER, timezone: TZ }];

// Reflections on ~1 in 5 fixture days (ADR-0017), deterministic like entries.
const daily_reflections = [];
for (let i = 420; i >= 0; i--) {
  const day = addDays(TODAY, -i);
  const roll = hash(day + "|reflection") % 100;
  if (roll < 20) {
    daily_reflections.push({
      user_id: OWNER,
      entry_date: day,
      reflection: roll < 5 ? "long day but the pieces finally fit" : "steady progress, nothing dramatic",
      created_at: `${day}T21:00:00+00:00`,
      updated_at: `${day}T21:00:00+00:00`,
    });
  }
}

const project_aliases = [
  { id: uuidFrom("alias:pl"), user_id: OWNER, project_id: active[0].id, alias: "pl", created_at: `${addDays(TODAY, -300)}T12:00:00+00:00` },
  { id: uuidFrom("alias:aim"), user_id: OWNER, project_id: active[1].id, alias: "aim", created_at: `${addDays(TODAY, -300)}T12:00:00+00:00` },
];

const TABLES = { projects, entries, app_settings, project_aliases, daily_reflections };

// --- GoTrue subset -------------------------------------------------------

const USER = {
  id: OWNER,
  aud: "authenticated",
  role: "authenticated",
  email: EMAIL,
  email_confirmed_at: "2026-01-01T00:00:00Z",
  phone: "",
  confirmed_at: "2026-01-01T00:00:00Z",
  last_sign_in_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { email: EMAIL, email_verified: true, sub: OWNER },
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  is_anonymous: false,
};

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function makeSession() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `http://127.0.0.1:${PORT}/auth/v1`,
    sub: OWNER,
    aud: "authenticated",
    exp: now + 86400,
    iat: now,
    email: EMAIL,
    phone: "",
    app_metadata: USER.app_metadata,
    user_metadata: USER.user_metadata,
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "otp", timestamp: now }],
    session_id: uuidFrom("session"),
    is_anonymous: false,
  };
  const head = b64url({ alg: "HS256", typ: "JWT" });
  const body = b64url(payload);
  const sig = createHmac("sha256", "mock-secret").update(`${head}.${body}`).digest("base64url");
  return {
    access_token: `${head}.${body}.${sig}`,
    token_type: "bearer",
    expires_in: 86400,
    expires_at: now + 86400,
    refresh_token: "mock-refresh-token",
    user: USER,
  };
}

// --- PostgREST subset ----------------------------------------------------

// Splits on commas at paren depth zero: "*, project:projects(id, name)" ->
// ["*", "project:projects(id, name)"].
function splitTop(s) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function project(row, table, select) {
  if (!select || select === "*") return { ...row };
  const out = {};
  for (const part of splitTop(select)) {
    if (part === "*") {
      Object.assign(out, row);
      continue;
    }
    const embed = part.match(/^(?:(\w+):)?(\w+)\(([^)]*)\)$/);
    if (embed) {
      const [, alias, refTable, cols] = embed;
      if (refTable === "projects" && table === "entries") {
        const ref = projects.find((p) => p.id === row.project_id) ?? null;
        out[alias ?? refTable] = ref ? project(ref, "projects", cols) : null;
      }
      continue;
    }
    out[part] = row[part];
  }
  return out;
}

function condMatches(row, cond) {
  // One "col.op.value" condition from an or=() group.
  const m = cond.match(/^(\w+)\.(not\.is|is|eq|neq|gt|gte|lt|lte)\.(.*)$/);
  if (!m) return false;
  return opMatches(row[m[1]], m[2], m[3]);
}

function opMatches(v, op, raw) {
  const val = raw === "null" ? null : raw;
  switch (op) {
    case "eq": return String(v) === val;
    case "neq": return String(v) !== val;
    case "is": return val === null ? v === null : String(v) === val;
    case "not.is": return val === null ? v !== null : String(v) !== val;
    case "gt": return v > val;
    case "gte": return v >= val;
    case "lt": return v < val;
    case "lte": return v <= val;
    default: return false;
  }
}

function queryTable(table, params) {
  let rows = [...TABLES[table]];
  for (const [key, value] of params) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (key === "or") {
      const conds = splitTop(value.replace(/^\(|\)$/g, ""));
      rows = rows.filter((r) => conds.some((c) => condMatches(r, c)));
      continue;
    }
    const m = value.match(/^(not\.is|is|eq|neq|gt|gte|lt|lte)\.(.*)$/);
    if (!m) continue;
    rows = rows.filter((r) => opMatches(r[key], m[1], m[2]));
  }
  const order = params.get("order");
  if (order) {
    const keys = order.split(",").map((k) => {
      const [col, dir] = k.split(".");
      return { col, desc: dir === "desc" };
    });
    rows.sort((a, b) => {
      for (const { col, desc } of keys) {
        if (a[col] < b[col]) return desc ? 1 : -1;
        if (a[col] > b[col]) return desc ? -1 : 1;
      }
      return 0;
    });
  }
  const limit = params.get("limit");
  if (limit) rows = rows.slice(0, Number(limit));
  return rows.map((r) => project(r, table, params.get("select")));
}

// --- server --------------------------------------------------------------

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const send = (code, body, headers = {}) => {
    res.writeHead(code, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  if (url.pathname === "/auth/v1/health") return send(200, { name: "GoTrue (mock)" });
  if (url.pathname === "/auth/v1/user") return send(200, USER);
  if (url.pathname === "/auth/v1/verify" && req.method === "POST") return send(200, makeSession());
  if (url.pathname === "/auth/v1/token" && req.method === "POST") return send(200, makeSession());
  if (url.pathname.startsWith("/auth/v1/admin/users/")) return send(200, USER);
  if (url.pathname === "/auth/v1/admin/generate_link" && req.method === "POST") {
    return send(200, { hashed_token: "mock-token-hash", verification_type: "magiclink", email: EMAIL });
  }

  const rest = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
  if (rest) {
    const table = rest[1];
    if (!(table in TABLES)) return send(404, { message: `unknown table ${table}` });
    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(405, { message: "mock is read-only" });
    }
    const rows = queryTable(table, url.searchParams);
    if ((req.headers.accept ?? "").includes("application/vnd.pgrst.object+json")) {
      if (rows.length !== 1) {
        return send(406, {
          code: "PGRST116",
          message: `JSON object requested, multiple (or no) rows returned: ${rows.length} rows`,
          details: null,
          hint: null,
        });
      }
      return send(200, rows[0]);
    }
    return send(200, rows);
  }

  send(404, { message: `mock-supabase: no handler for ${req.method} ${url.pathname}` });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock-supabase on http://127.0.0.1:${PORT} (today=${TODAY}, ${entries.length} entries)`);
});
