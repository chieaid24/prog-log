// Discord interactions endpoint (PRD 4.1, ADR-0002). Discord POSTs every
// interaction here: PING handshakes, /log and /reflect commands, and project
// autocomplete. Ed25519 signature first, owner gate second; /log delegates
// resolution and the write to the shared capture pipeline (captureLog,
// ADR-0001); /reflect writes through the set_reflection RPC (ADR-0017).
import { captureLog } from "@/lib/capture";
import { DEMO_WRITE_NOTE, isDemoMode } from "@/lib/demo/mode";
import { getOwnerActiveProjects, getOwnerAliases } from "@/lib/discord/owner";
import { verifyDiscordSignature } from "@/lib/discord/verify";
import type { Db } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIME_SIZES, type TimeSize } from "@/lib/types";

// Interaction types (request) and callback types (response) we handle.
const PING = 1;
const APPLICATION_COMMAND = 2;
const AUTOCOMPLETE = 4;
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const AUTOCOMPLETE_RESULT = 8;
const EPHEMERAL = 64;
const MAX_CHOICES = 25;

type InteractionOption = {
  name: string;
  value?: string | number | boolean;
  focused?: boolean;
};

type Interaction = {
  type: number;
  member?: { user?: { id?: string } };
  user?: { id?: string };
  data?: { name?: string; options?: InteractionOption[] };
};

/** Type-4 ephemeral reply — only the owner ever sees bot responses. */
function reply(content: string): Response {
  return Response.json({ type: CHANNEL_MESSAGE, data: { content, flags: EPHEMERAL } });
}

function isTimeSize(value: string): value is TimeSize {
  return (TIME_SIZES as readonly string[]).includes(value);
}

export async function POST(req: Request): Promise<Response> {
  // DEMO_MODE (ADR-0016): capture is a no-op that never touches the database.
  if (isDemoMode()) {
    return Response.json({ ok: false, demo: true, error: DEMO_WRITE_NOTE });
  }

  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const rawBody = await req.text();
  if (
    !signature ||
    !timestamp ||
    !verifyDiscordSignature(process.env.DISCORD_PUBLIC_KEY ?? "", signature, timestamp, rawBody)
  ) {
    return new Response("bad signature", { status: 401 });
  }

  let interaction: Interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return new Response("malformed body", { status: 400 });
  }

  if (interaction.type === PING) return Response.json({ type: PONG });

  // Owner gate — commands and autocomplete alike (PRD 4.1: ignore everyone else).
  const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
  const isOwner = Boolean(discordUserId) && discordUserId === process.env.DISCORD_OWNER_ID;

  if (interaction.type === AUTOCOMPLETE) {
    if (!isOwner) {
      return Response.json({ type: AUTOCOMPLETE_RESULT, data: { choices: [] } });
    }
    return handleAutocomplete(interaction);
  }

  if (interaction.type === APPLICATION_COMMAND) {
    if (!isOwner) return reply("not authorized");
    if (interaction.data?.name === "log") return handleLogCommand(interaction);
    if (interaction.data?.name === "reflect") return handleReflectCommand(interaction);
    return reply("unknown command");
  }

  return new Response("unsupported interaction type", { status: 400 });
}

/**
 * Project-name choices from the owner's active Projects — an alias hit
 * surfaces its Project under the canonical name (ADR-0010: aliases are input
 * sugar, never output vocabulary).
 */
async function handleAutocomplete(interaction: Interaction): Promise<Response> {
  const focused = (interaction.data?.options ?? []).find((o) => o.focused);
  if (!focused || focused.name !== "project") {
    return Response.json({ type: AUTOCOMPLETE_RESULT, data: { choices: [] } });
  }
  const typed = String(focused.value ?? "").trim().toLowerCase();
  const db = createAdminClient();
  const [projects, aliases] = await Promise.all([
    getOwnerActiveProjects(db, ownerId()),
    getOwnerAliases(db, ownerId()),
  ]);
  const aliasHit = new Set(
    aliases
      .filter((a) => typed.length > 0 && a.alias.toLowerCase().includes(typed))
      .map((a) => a.project_id),
  );
  const choices = projects
    .filter(
      (p) => typed.length === 0 || p.name.toLowerCase().includes(typed) || aliasHit.has(p.id),
    )
    .slice(0, MAX_CHOICES)
    .map((p) => ({ name: p.name, value: p.name }));
  return Response.json({ type: AUTOCOMPLETE_RESULT, data: { choices } });
}

/** /log: option normalization here, capture decisions in captureLog. */
async function handleLogCommand(interaction: Interaction): Promise<Response> {
  const opts = Object.fromEntries(
    (interaction.data?.options ?? []).map((o) => [o.name, String(o.value ?? "")]),
  );

  const time = opts.time ?? "";
  if (!isTimeSize(time)) {
    return reply(`"${time}" is not a time commitment - use small, medium or large.`);
  }

  const result = await captureLog(createAdminClient(), {
    ownerId: ownerId(),
    rawProject: opts.project ?? "",
    timeSpent: time,
    milestone: opts.milestone ?? null,
    description: opts.description ?? null,
  });
  if (result.status === "unresolved") return reply(result.message);
  if (result.status === "write-failed") return reply("could not save the entry - try again.");

  const suffix = opts.milestone ? `, milestone: ${opts.milestone}` : "";
  return reply(`logged ${result.project.name} - ${time}${suffix}`);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * /reflect: overwrite the day's reflection through set_reflection, the sole
 * write surface (ADR-0017). Optional date targets a past day; omitted, the
 * RPC falls back to today in the owner's stored timezone (ADR-0004).
 */
async function handleReflectCommand(interaction: Interaction): Promise<Response> {
  const opts = Object.fromEntries(
    (interaction.data?.options ?? []).map((o) => [o.name, String(o.value ?? "")]),
  );

  const reflection = (opts.reflection ?? "").trim();
  if (!reflection) return reply("write a line first.");

  const date = (opts.date ?? "").trim();
  if (date && !ISO_DATE.test(date)) {
    return reply(`"${date}" is not a date - use YYYY-MM-DD.`);
  }

  const db: Db = createAdminClient();
  const { data, error } = await db.rpc("set_reflection", {
    p_reflection: reflection,
    p_user: ownerId(),
    ...(date ? { p_date: date } : {}),
  });
  if (error || !data) return reply("could not save the reflection - try again.");

  return reply(`reflection saved for ${data.entry_date}`);
}

function ownerId(): string {
  return process.env.OWNER_USER_ID ?? "";
}
