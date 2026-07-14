// Discord interactions endpoint (PRD 4.1, ADR-0002). Discord POSTs every
// interaction here: PING handshakes, /log commands, and project autocomplete.
// Ed25519 signature first, owner gate second; /log delegates resolution and
// the write to the shared capture pipeline (captureLog, ADR-0001).
import { captureLog } from "@/lib/capture";
import { getOwnerActiveProjects, getOwnerAliases } from "@/lib/discord/owner";
import { verifyDiscordSignature } from "@/lib/discord/verify";
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
    return handleLogCommand(interaction);
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
  if (interaction.data?.name !== "log") return reply("unknown command");

  const opts = Object.fromEntries(
    (interaction.data.options ?? []).map((o) => [o.name, String(o.value ?? "")]),
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

function ownerId(): string {
  return process.env.OWNER_USER_ID ?? "";
}
