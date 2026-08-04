// The single shared write path for Expeditions (ADR-0018). Every capture
// surface - the web tab and Discord /expedition - goes through these
// wrappers, which call the security-invoker RPCs: the only writers of the
// expeditions table. Session callers omit userId (the RPCs default to
// auth.uid() under RLS); service-role callers pass the owner id explicitly.
import type { Db } from "./queries";
import type { Expedition } from "./types";

type Owner = {
  /** Owner id - required for service-role callers; session callers omit it. */
  userId?: string;
};

export type AddExpeditionInput = Owner & {
  title: string;
  description?: string | null;
};

/** Append a new open Expedition to the bottom of the todo list. */
export async function addExpedition(db: Db, input: AddExpeditionInput): Promise<Expedition> {
  const { data, error } = await db.rpc("add_expedition", {
    p_title: input.title,
    p_description: input.description ?? null,
    ...(input.userId ? { p_user: input.userId } : {}),
  });
  if (error) throw error;
  return data as Expedition;
}

export type UpdateExpeditionInput = Owner & {
  id: string;
  title: string;
  description?: string | null;
};

/** Rewrite an Expedition's title and description (null clears it). */
export async function updateExpedition(db: Db, input: UpdateExpeditionInput): Promise<Expedition> {
  const { data, error } = await db.rpc("update_expedition", {
    p_id: input.id,
    p_title: input.title,
    p_description: input.description ?? null,
    ...(input.userId ? { p_user: input.userId } : {}),
  });
  if (error) throw error;
  return data as Expedition;
}

/** Persist a manual order: positions rewritten from the ordered id array. */
export async function reorderExpeditions(
  db: Db,
  input: Owner & { ids: string[] },
): Promise<Expedition[]> {
  const { data, error } = await db.rpc("reorder_expeditions", {
    p_ids: input.ids,
    ...(input.userId ? { p_user: input.userId } : {}),
  });
  if (error) throw error;
  return data as Expedition[];
}

export type AnswerExpeditionInput = Owner & {
  id: string;
  url: string;
  videoId?: string | null;
  title?: string | null;
};

/** Attach the answering YouTube video and flip the Expedition to answered. */
export async function answerExpedition(db: Db, input: AnswerExpeditionInput): Promise<Expedition> {
  const { data, error } = await db.rpc("answer_expedition", {
    p_id: input.id,
    p_url: input.url,
    p_video_id: input.videoId ?? null,
    p_title: input.title ?? null,
    ...(input.userId ? { p_user: input.userId } : {}),
  });
  if (error) throw error;
  return data as Expedition;
}

/** Send an answered Expedition back to the bottom of the todo list, link retained. */
export async function reopenExpedition(db: Db, input: Owner & { id: string }): Promise<Expedition> {
  const { data, error } = await db.rpc("reopen_expedition", {
    p_id: input.id,
    ...(input.userId ? { p_user: input.userId } : {}),
  });
  if (error) throw error;
  return data as Expedition;
}

/** Delete an Expedition outright. */
export async function deleteExpedition(db: Db, input: Owner & { id: string }): Promise<void> {
  const { error } = await db.rpc("delete_expedition", {
    p_id: input.id,
    ...(input.userId ? { p_user: input.userId } : {}),
  });
  if (error) throw error;
}
