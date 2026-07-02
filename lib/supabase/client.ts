import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the anon key; every query runs under RLS as
 * the signed-in user. Never handles the service-role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
