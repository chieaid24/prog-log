"use server";

import { revalidatePath } from "next/cache";
import { demoWriteResult, isDemoMode, type DemoWriteResult } from "@/lib/demo/mode";
import {
  addAlias,
  createProject,
  deleteProject,
  removeAlias,
  setProjectStatus,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectAlias } from "@/lib/types";

export type ProjectActionResult =
  | { ok: true; project: Project }
  | { ok: false; error: string }
  | DemoWriteResult;
export type AliasActionResult =
  | { ok: true; alias?: ProjectAlias }
  | { ok: false; error: string }
  | DemoWriteResult;
export type DeleteProjectActionResult =
  | { ok: true }
  | { ok: false; error: string }
  | DemoWriteResult;

const CATEGORIES = ["Work", "Research", "Personal", "Learning"] as const;

/** Create (or dedupe-select) a Project — used inline from quick add and on /projects. */
export async function createProjectAction(input: {
  name: string;
  category?: string;
  color?: string;
  description?: string;
}): Promise<ProjectActionResult> {
  if (isDemoMode()) return demoWriteResult();
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Project name is required." };
  if (input.category && !CATEGORIES.includes(input.category as (typeof CATEGORIES)[number])) {
    return { ok: false, error: "Unknown category." };
  }

  try {
    const supabase = await createClient();
    const project = await createProject(supabase, {
      name,
      category: input.category || null,
      color: input.color || null,
      description: input.description?.trim() || null,
    });
    revalidatePath("/", "layout");
    return { ok: true, project };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the project." };
  }
}

/** Archive or restore a Project. */
export async function setProjectStatusAction(
  projectId: string,
  status: "active" | "archived",
): Promise<ProjectActionResult> {
  if (isDemoMode()) return demoWriteResult();
  try {
    const supabase = await createClient();
    const project = await setProjectStatus(supabase, projectId, status);
    revalidatePath("/", "layout");
    return { ok: true, project };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update the project." };
  }
}

export async function deleteProjectAction(projectId: string): Promise<DeleteProjectActionResult> {
  if (isDemoMode()) return demoWriteResult();
  try {
    const supabase = await createClient();
    await deleteProject(supabase, projectId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete the project." };
  }
}

/** Add a capture alias (ADR-0010) — `aim` logs to AI-M from Discord. */
export async function addProjectAliasAction(
  projectId: string,
  alias: string,
): Promise<AliasActionResult> {
  if (isDemoMode()) return demoWriteResult();
  if (!alias?.trim()) return { ok: false, error: "Alias cannot be empty." };
  try {
    const supabase = await createClient();
    const row = await addAlias(supabase, projectId, alias);
    revalidatePath("/projects");
    return { ok: true, alias: row };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not add the alias." };
  }
}

/** Remove a capture alias. */
export async function removeProjectAliasAction(aliasId: string): Promise<AliasActionResult> {
  if (isDemoMode()) return demoWriteResult();
  try {
    const supabase = await createClient();
    await removeAlias(supabase, aliasId);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove the alias." };
  }
}

/** Edit name/category/color/description (B5 project management). */
export async function updateProjectAction(
  projectId: string,
  patch: { name?: string; category?: string | null; color?: string | null; description?: string | null },
): Promise<ProjectActionResult> {
  if (isDemoMode()) return demoWriteResult();
  const update: Record<string, string | null> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return { ok: false, error: "Project name is required." };
    update.name = name;
  }
  if (patch.category !== undefined) {
    if (patch.category && !CATEGORIES.includes(patch.category as (typeof CATEGORIES)[number])) {
      return { ok: false, error: "Unknown category." };
    }
    update.category = patch.category;
  }
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.description !== undefined) update.description = patch.description;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .update(update)
      .eq("id", projectId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, project: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update the project." };
  }
}
