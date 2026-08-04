"use server";

import { revalidatePath } from "next/cache";
import { demoWriteResult, isDemoMode, type DemoWriteResult } from "@/lib/demo/mode";
import {
  addExpedition,
  answerExpedition,
  deleteExpedition,
  reopenExpedition,
  reorderExpeditions,
  updateExpedition,
} from "@/lib/expeditions";
import { createClient } from "@/lib/supabase/server";
import type { Expedition } from "@/lib/types";
import { fetchYouTubeTitle, parseYouTubeVideoId } from "@/lib/youtube";

export type ExpeditionResult =
  | { ok: true; expedition: Expedition }
  | { ok: false; error: string }
  | DemoWriteResult;

export type ExpeditionListResult =
  | { ok: true; expeditions: Expedition[] }
  | { ok: false; error: string }
  | DemoWriteResult;

export type ExpeditionDeleteResult = { ok: true } | { ok: false; error: string } | DemoWriteResult;

export type ExpeditionDraft = {
  title: string;
  description?: string;
};

function fail(e: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : fallback };
}

/** Web capture - session caller, RLS enforced, add_expedition is the only writer (ADR-0018). */
export async function addExpeditionAction(draft: ExpeditionDraft): Promise<ExpeditionResult> {
  if (isDemoMode()) return demoWriteResult();
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "Write a title first." };

  try {
    const supabase = await createClient();
    const expedition = await addExpedition(supabase, {
      title,
      description: draft.description?.trim() || null,
    });
    revalidatePath("/", "layout");
    return { ok: true, expedition };
  } catch (e) {
    return fail(e, "Could not add the Expedition.");
  }
}

export async function updateExpeditionAction(
  id: string,
  draft: ExpeditionDraft,
): Promise<ExpeditionResult> {
  if (isDemoMode()) return demoWriteResult();
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "Write a title first." };

  try {
    const supabase = await createClient();
    const expedition = await updateExpedition(supabase, {
      id,
      title,
      description: draft.description?.trim() || null,
    });
    revalidatePath("/", "layout");
    return { ok: true, expedition };
  } catch (e) {
    return fail(e, "Could not save the Expedition.");
  }
}

/** Persist a drag reorder: the open list's ids in their new top-to-bottom order. */
export async function reorderExpeditionsAction(ids: string[]): Promise<ExpeditionListResult> {
  if (isDemoMode()) return demoWriteResult();
  if (ids.length === 0) return { ok: false, error: "Nothing to reorder." };

  try {
    const supabase = await createClient();
    const expeditions = await reorderExpeditions(supabase, { ids });
    revalidatePath("/", "layout");
    return { ok: true, expeditions };
  } catch (e) {
    return fail(e, "Could not save the new order.");
  }
}

/**
 * Answer with a YouTube link: parse the video id from the URL (invalid links
 * are rejected), resolve the title via oEmbed - null on failure, so the
 * showcase falls back to the raw link (ADR-0019) - then store both.
 */
export async function answerExpeditionAction(id: string, url: string): Promise<ExpeditionResult> {
  if (isDemoMode()) return demoWriteResult();
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, error: "Paste the YouTube link first." };
  const videoId = parseYouTubeVideoId(trimmed);
  if (!videoId) {
    return { ok: false, error: "That is not a YouTube link. Paste a watch, youtu.be, shorts, or embed URL." };
  }

  try {
    const title = await fetchYouTubeTitle(trimmed);
    const supabase = await createClient();
    const expedition = await answerExpedition(supabase, { id, url: trimmed, videoId, title });
    revalidatePath("/", "layout");
    return { ok: true, expedition };
  } catch (e) {
    return fail(e, "Could not answer the Expedition.");
  }
}

/** Reopen an answered Expedition: back to the bottom of the todo list, link retained. */
export async function reopenExpeditionAction(id: string): Promise<ExpeditionResult> {
  if (isDemoMode()) return demoWriteResult();

  try {
    const supabase = await createClient();
    const expedition = await reopenExpedition(supabase, { id });
    revalidatePath("/", "layout");
    return { ok: true, expedition };
  } catch (e) {
    return fail(e, "Could not reopen the Expedition.");
  }
}

export async function deleteExpeditionAction(id: string): Promise<ExpeditionDeleteResult> {
  if (isDemoMode()) return demoWriteResult();

  try {
    const supabase = await createClient();
    await deleteExpedition(supabase, { id });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not delete the Expedition.");
  }
}
