import type { Metadata } from "next";
import { ExpeditionManager } from "@/components/expeditions/expedition-manager";
import { getAnsweredExpeditions, getOpenExpeditions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expeditions" };
export const dynamic = "force-dynamic";

export default async function ExpeditionsPage() {
  const supabase = await createClient();
  const [open, answered] = await Promise.all([
    getOpenExpeditions(supabase),
    getAnsweredExpeditions(supabase),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Expeditions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ideas to explain on video. New Expeditions join the bottom of the list; drag to
          reorder, and attach the YouTube link once one is answered.
        </p>
      </header>
      <ExpeditionManager open={open} answered={answered} />
    </div>
  );
}
