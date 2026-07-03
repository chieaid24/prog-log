// Export/import serialization (PRD §8 stretch; ADR-0008). Pure: no IO here.
// The export format is the import format — CSV for spreadsheets, a versioned
// JSON envelope for full fidelity. Import never writes directly; callers feed
// the parsed rows through createProject + upsertEntry (the shared write path).
import { TIME_SIZES, type EntryWithProject, type Project, type TimeSize } from "./types";

export const CSV_HEADER = ["entry_date", "project", "time_spent", "milestone", "description"] as const;

/** One normalized Entry row, the common currency of both formats. */
export type ImportRow = {
  entryDate: string;
  projectName: string;
  timeSpent: TimeSize;
  milestone: string | null;
  description: string | null;
};

export type RowError = { line: number; message: string };

export type ParsedImport = {
  rows: ImportRow[];
  errors: RowError[];
  /** Project metadata carried by JSON exports (category/color/status restore). */
  projects: ExportedProject[];
};

export type ExportedProject = {
  name: string;
  category: string | null;
  color: string | null;
  status: string;
  description: string | null;
};

export type ExportEnvelope = {
  format: "prog-log-export";
  version: 1;
  exported_at: string;
  timezone: string;
  projects: ExportedProject[];
  entries: Array<{
    entry_date: string;
    project: string;
    time_spent: TimeSize;
    milestone: string | null;
    description: string | null;
  }>;
};

/** RFC-4180 field escaping: quote when the value needs it, double inner quotes. */
function csvField(value: string | null): string {
  if (value === null || value === "") return "";
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Flat CSV of every Entry, ordered as fetched (entry_date ascending). */
export function entriesToCSV(entries: readonly EntryWithProject[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const e of entries) {
    lines.push(
      [
        csvField(e.entry_date),
        csvField(e.project.name),
        csvField(e.time_spent),
        csvField(e.milestone),
        csvField(e.description),
      ].join(","),
    );
  }
  return lines.join("\r\n") + "\r\n";
}

/** Versioned full-fidelity envelope: Projects with metadata + every Entry. */
export function buildExportJSON(
  projects: readonly Project[],
  entries: readonly EntryWithProject[],
  timezone: string,
  now: Date = new Date(),
): ExportEnvelope {
  return {
    format: "prog-log-export",
    version: 1,
    exported_at: now.toISOString(),
    timezone,
    projects: projects.map((p) => ({
      name: p.name,
      category: p.category,
      color: p.color,
      status: p.status,
      description: p.description,
    })),
    entries: entries.map((e) => ({
      entry_date: e.entry_date,
      project: e.project.name,
      time_spent: e.time_spent,
      milestone: e.milestone,
      description: e.description,
    })),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Accept "small" | "s", any case, plus the UI labels. */
function normalizeTimeSize(raw: string): TimeSize | null {
  const v = raw.trim().toLowerCase();
  for (const size of TIME_SIZES) {
    if (v === size || v === size[0]) return size;
  }
  return null;
}

function validateRow(
  line: number,
  raw: { entry_date: string; project: string; time_spent: string; milestone: string; description: string },
): { row: ImportRow } | { error: RowError } {
  const entryDate = raw.entry_date.trim();
  if (!isRealDate(entryDate)) {
    return { error: { line, message: `invalid entry_date "${raw.entry_date}" (expected YYYY-MM-DD)` } };
  }
  const projectName = raw.project.trim();
  if (projectName.length === 0) {
    return { error: { line, message: "missing project name" } };
  }
  const timeSpent = normalizeTimeSize(raw.time_spent);
  if (!timeSpent) {
    return { error: { line, message: `invalid time_spent "${raw.time_spent}" (small|medium|large)` } };
  }
  const milestone = raw.milestone.trim();
  const description = raw.description.trim();
  return {
    row: {
      entryDate,
      projectName,
      timeSpent,
      milestone: milestone.length > 0 ? milestone : null,
      description: description.length > 0 ? description : null,
    },
  };
}

/** RFC-4180 tolerant CSV split: quoted fields, doubled quotes, CRLF or LF. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty trailing lines.
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

/** Case-insensitive header aliases so Notion-ish exports import unedited. */
const HEADER_ALIASES: Record<string, (typeof CSV_HEADER)[number]> = {
  entry_date: "entry_date",
  date: "entry_date",
  day: "entry_date",
  project: "project",
  "project name": "project",
  time_spent: "time_spent",
  time: "time_spent",
  "time commitment": "time_spent",
  size: "time_spent",
  milestone: "milestone",
  description: "description",
  notes: "description",
  detail: "description",
};

function parseImportCSV(text: string): ParsedImport {
  const grid = parseCSV(text);
  if (grid.length === 0) {
    return { rows: [], errors: [{ line: 1, message: "empty file" }], projects: [] };
  }
  const header = grid[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
  const col = (name: (typeof CSV_HEADER)[number]) => header.indexOf(name);
  if (col("entry_date") === -1 || col("project") === -1 || col("time_spent") === -1) {
    return {
      rows: [],
      errors: [{ line: 1, message: "header must include entry_date (or date), project, time_spent" }],
      projects: [],
    };
  }
  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  const pick = (r: string[], name: (typeof CSV_HEADER)[number]) => {
    const i = col(name);
    return i === -1 ? "" : (r[i] ?? "");
  };
  for (let i = 1; i < grid.length; i++) {
    const result = validateRow(i + 1, {
      entry_date: pick(grid[i], "entry_date"),
      project: pick(grid[i], "project"),
      time_spent: pick(grid[i], "time_spent"),
      milestone: pick(grid[i], "milestone"),
      description: pick(grid[i], "description"),
    });
    if ("row" in result) rows.push(result.row);
    else errors.push(result.error);
  }
  return { rows, errors, projects: [] };
}

function parseImportJSON(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { rows: [], errors: [{ line: 1, message: "not valid JSON" }], projects: [] };
  }
  const envelope = data as Partial<ExportEnvelope>;
  if (envelope?.format !== "prog-log-export" || !Array.isArray(envelope.entries)) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'not a prog-log export (missing format: "prog-log-export")' }],
      projects: [],
    };
  }
  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  envelope.entries.forEach((e, i) => {
    const result = validateRow(i + 1, {
      entry_date: String(e?.entry_date ?? ""),
      project: String(e?.project ?? ""),
      time_spent: String(e?.time_spent ?? ""),
      milestone: e?.milestone == null ? "" : String(e.milestone),
      description: e?.description == null ? "" : String(e.description),
    });
    if ("row" in result) rows.push(result.row);
    else errors.push(result.error);
  });
  const projects: ExportedProject[] = Array.isArray(envelope.projects)
    ? envelope.projects
        .filter((p): p is ExportedProject => typeof p?.name === "string" && p.name.trim().length > 0)
        .map((p) => ({
          name: p.name,
          category: p.category ?? null,
          color: p.color ?? null,
          status: p.status === "archived" ? "archived" : "active",
          description: p.description ?? null,
        }))
    : [];
  return { rows, errors, projects };
}

/** Sniff JSON vs CSV and parse into normalized rows + per-line errors. */
export function parseImport(text: string): ParsedImport {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return parseImportJSON(text);
  return parseImportCSV(text);
}
