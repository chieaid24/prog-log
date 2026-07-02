// Apple Shortcut ingest (PRD 4.2, ADR-0002). A single-purpose bearer secret
// gates the route; project resolution follows the same never-guess rule as
// Discord, and the write goes through upsertEntry — the single shared write
// path (ADR-0001).
import { bearerMatches } from "@/lib/capture";
import { getOwnerActiveProjects, noMatchMessage } from "@/lib/discord/owner";
import { upsertEntry } from "@/lib/entries";
import { resolveProject } from "@/lib/projects";
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

  const db = createAdminClient();
  const ownerId = process.env.OWNER_USER_ID ?? "";
  const projects = await getOwnerActiveProjects(db, ownerId);
  const resolution = resolveProject(projects, rawProject);
  if (resolution.status !== "match") {
    return Response.json(
      { error: noMatchMessage(rawProject, resolution.near) },
      { status: 404 },
    );
  }

  try {
    const entry = await upsertEntry(db, {
      projectId: resolution.project.id,
      timeSpent: body.time,
      milestone: optionalText(body.milestone),
      description: optionalText(body.description),
      userId: ownerId,
    });
    return Response.json({
      ok: true,
      message: `logged ${resolution.project.name} - ${body.time}`,
      entry,
    });
  } catch {
    return Response.json({ error: "could not save the entry" }, { status: 500 });
  }
}
