import type { Metadata } from "next";
import { signOut } from "@/app/actions/auth";
import { DataSection } from "@/components/settings/data-section";
import { TimezoneForm } from "@/components/settings/timezone-form";
import { getUserTimezone } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { listTimeZones } from "@/lib/timezones";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const timezone = await getUserTimezone(supabase);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section aria-label="Timezone" className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-medium text-muted">Timezone</h2>
        <TimezoneForm current={timezone} timezones={listTimeZones()} />
      </section>

      <section aria-label="Data" className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-medium text-muted">Data</h2>
        <DataSection />
      </section>

      <section aria-label="Account" className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-medium text-muted">Account</h2>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
