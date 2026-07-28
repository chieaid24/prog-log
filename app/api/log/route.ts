// Apple Shortcut ingest (PRD 4.2, ADR-0002). A single-purpose bearer secret
// gates the route; resolution and the write are the shared capture pipeline
// (captureLog, ADR-0001) — this file only parses the body and shapes JSON.
import { bearerMatches, captureLog } from "@/lib/capture";
import { DEMO_WRITE_NOTE, isDemoMode } from "@/lib/demo/mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIME_SIZES, type TimeSize } from "@/lib/types";

type LogBody = {
  project?: unknown;
  time?: unknown;
  milestone?: unknown;
  description?: unknown;
};

function isTimeSize(value: unknown): value is TimeSize {
  return typeof value === "string" && (TIME_SIZES as readonly string[]).includes(value);
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function POST(req: Request): Promise<Response> {
  // DEMO_MODE (ADR-0016): capture is a no-op that never touches the database.
  if (isDemoMode()) {
    return Response.json({ ok: false, demo: true, error: DEMO_WRITE_NOTE });
  }

  if (!bearerMatches(req.headers.get("authorization"), process.env.SHORTCUT_SECRET)) {
    return Response.json({ error: "not authorized" }, { status: 401 });
  }

  let body: LogBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "body must be json" }, { status: 400 });
  }

  const rawProject = typeof body.project === "string" ? body.project.trim() : "";
  if (rawProject.length === 0) {
    return Response.json({ error: "project is required" }, { status: 400 });
  }
  if (!isTimeSize(body.time)) {
    return Response.json(
      { error: `"${String(body.time ?? "")}" is not a time commitment - use small, medium or large.` },
      { status: 400 },
    );
  }

  const result = await captureLog(createAdminClient(), {
    ownerId: process.env.OWNER_USER_ID ?? "",
    rawProject,
    timeSpent: body.time,
    milestone: optionalText(body.milestone),
    description: optionalText(body.description),
  });
  if (result.status === "unresolved") {
    return Response.json({ error: result.message }, { status: 404 });
  }
  if (result.status === "write-failed") {
    return Response.json({ error: "could not save the entry" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    message: `logged ${result.project.name} - ${body.time}`,
    entry: result.entry,
  });
}
