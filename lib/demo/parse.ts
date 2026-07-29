// Deterministic CSV -> domain parsing for the DEMO_MODE fixture provider
// (ADR-0016). Pure: string in, domain rows out, no I/O. Handles RFC 4180
// quoting (embedded commas, quotes and newlines) so fixture prose is safe.
import { TIME_SIZES, type Entry, type Project, type Reflection, type TimeSize } from "../types";
import { DEMO_USER_ID } from "./mode";

/** Split CSV text into rows of raw fields (RFC 4180: quotes, commas, newlines). */
function tokenize(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\n") {
      endRow();
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) endRow();
  return rows;
}

/** Parse CSV into records keyed by the header row; blank lines are dropped. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = tokenize(text).filter((cells) => !(cells.length === 1 && cells[0] === ""));
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = cells[i] ?? "";
    });
    return record;
  });
}

/** Empty cell -> null, matching the nullable columns in the schema. */
function orNull(value: string): string | null {
  return value === "" ? null : value;
}

/** Parse the projects fixture into `Project` rows (owner + created_at synthesized). */
export function parseProjectsCsv(text: string): Project[] {
  return parseCsv(text).map((r) => ({
    id: r.id,
    user_id: DEMO_USER_ID,
    name: r.name,
    category: orNull(r.category ?? ""),
    status: r.status || "active",
    color: orNull(r.color ?? ""),
    started: orNull(r.started ?? ""),
    description: orNull(r.description ?? ""),
    created_at: r.created_at || `${r.started || "2026-01-01"}T12:00:00Z`,
  }));
}

/** Parse the reflections fixture into `Reflection` rows; rejects an empty reflection. */
export function parseReflectionsCsv(text: string): Reflection[] {
  return parseCsv(text).map((r) => {
    if (!r.reflection) {
      throw new Error(`demo fixture: empty reflection for ${r.entry_date}`);
    }
    return {
      user_id: DEMO_USER_ID,
      entry_date: r.entry_date,
      reflection: r.reflection,
      created_at: r.created_at || `${r.entry_date}T21:00:00Z`,
      updated_at: r.updated_at || `${r.entry_date}T21:00:00Z`,
    };
  });
}

/** Parse the entries fixture into `Entry` rows; rejects an unknown time_spent. */
export function parseEntriesCsv(text: string): Entry[] {
  return parseCsv(text).map((r) => {
    const time = r.time_spent as TimeSize;
    if (!TIME_SIZES.includes(time)) {
      throw new Error(`demo fixture: invalid time_spent "${r.time_spent}" for entry ${r.id}`);
    }
    return {
      id: r.id,
      user_id: DEMO_USER_ID,
      project_id: r.project_id,
      entry_date: r.entry_date,
      time_spent: time,
      milestone: orNull(r.milestone ?? ""),
      description: orNull(r.description ?? ""),
      created_at: r.created_at || `${r.entry_date}T12:00:00Z`,
    };
  });
}
