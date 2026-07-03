// GET /api/export?format=csv|json — download every Entry (PRD §8, ADR-0008).
// Session-gated: runs under RLS as the signed-in user, so it can only ever
// export that user's own data.
import { NextRequest, NextResponse } from "next/server";
import { buildExportJSON, entriesToCSV } from "@/lib/export";
import { getAllEntries, getAllProjects, getUserTimezone } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
  }

  const [entries, timezone] = await Promise.all([
    getAllEntries(supabase),
    getUserTimezone(supabase),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return new NextResponse(entriesToCSV(entries), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prog-log-${stamp}.csv"`,
      },
    });
  }

  const projects = await getAllProjects(supabase);
  return NextResponse.json(buildExportJSON(projects, entries, timezone), {
    headers: {
      "Content-Disposition": `attachment; filename="prog-log-${stamp}.json"`,
    },
  });
}
