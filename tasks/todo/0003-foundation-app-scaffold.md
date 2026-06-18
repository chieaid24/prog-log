# 0003 — Foundation: app scaffold + Supabase clients

- **Status:** todo
- **Owner:** unassigned
- **Created:** 2026-06-17
- **Related:** PRD §5, §7.1, `tasks/PLAN.md` (F1)

## Goal

A running Next.js 15 (App Router, TypeScript) + Tailwind app with a browser Supabase client (anon
key) and a server-only client (service-role key), env wiring, and the npm scripts the verification
pipeline expects. "Done" = `npm run build` and `npm run typecheck` pass and `npm run dev` serves a
page, with the service-role key never importable from a client component.

## Plan / checklist

- [ ] `create-next-app` (App Router, TS, Tailwind); commit the scaffold
- [ ] `lib/supabase/client.ts` (browser, anon key) + `lib/supabase/server.ts` (service-role,
      server-only — guard against client import)
- [ ] `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`
- [ ] npm scripts: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test`
- [ ] Verification (below)

## Verification

`npm run typecheck && npm run lint && npm run build` exit 0; `npm run dev` serves the index;
grep confirms `server.ts` is not reachable from any `"use client"` module. Paste outputs here.

## Outcome

(Filled on completion.)
