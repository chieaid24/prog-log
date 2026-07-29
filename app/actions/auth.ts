"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function requestMagicLink(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!ownerEmail || email !== ownerEmail) {
    return { ok: true };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/confirm` : undefined,
      shouldCreateUser: false,
    },
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
