# 0003 — Foundation: app scaffold + Supabase clients

- **Status:** done
- **Owner:** agent (feat/v1-build run)
- **Created:** 2026-06-17
- **Completed:** 2026-07-02
- **Related:** PRD §5, §7.1, `tasks/PLAN.md` (F1)

## Goal

A running Next.js 15 (App Router, TypeScript) + Tailwind app with a browser Supabase client (anon
key) and a server-only client (service-role key), env wiring, and the npm scripts the verification
pipeline expects. "Done" = `npm run build` and `npm run typecheck` pass and `npm run dev` serves a
page, with the service-role key never importable from a client component.

## Plan / checklist

- [x] `create-next-app` (App Router, TS, Tailwind); commit the scaffold
- [x] `lib/supabase/client.ts` (browser, anon key) + `lib/supabase/server.ts` (cookie-session,
      server-only) + `lib/supabase/admin.ts` (service-role, server-only — `server-only` import
      guard makes any client-component import a build error)
- [x] `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` (plus the full capture-layer secret set, documented inline)
- [x] npm scripts: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest)
- [x] Verification (below)

## Verification

All four gates exit 0 (2026-07-02):

```
> tsc --noEmit          (clean)
> eslint .              (clean)
> vitest run            (passWithNoTests — no tests yet at this phase)
> next build
Route (app)                                 Size  First Load JS
+ /                                      5.47 kB         108 kB
  (Static) prerendered as static content
```

`npm run dev --port 3123` served `/` with HTTP 200. Client-import guard: grep of all
`"use client"` modules for `supabase/server` / `supabase/admin` imports returned none; both
server modules import `server-only`, which fails the build if a client component pulls them in.

## Outcome

Next.js 15.5 (App Router, TS, Tailwind v4) scaffolded at repo root. Three Supabase client
factories split by trust level: `lib/supabase/client.ts` (browser, anon), `lib/supabase/server.ts`
(cookie session under RLS, server-only), `lib/supabase/admin.ts` (service-role, server-only).
Vitest 4 configured (`vitest.config.ts`, node env by default, jsdom per-file pragma for component
tests). `.env.example` documents every secret the full product needs. All deps for later waves
installed up front so parallel workers never touch `package.json`.
