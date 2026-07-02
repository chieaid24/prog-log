import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths reachable without a session: login + auth plumbing, the public "now"
 * page, and API routes (each API route enforces its own auth — Discord
 * signatures, bearer secrets, cron secrets).
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/now" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/")
  );
}

/**
 * Refresh the Supabase session cookie and gate private routes. Standard
 * @supabase/ssr middleware shape: the response object carries refreshed
 * cookies; getUser() must be called to trigger the refresh.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
