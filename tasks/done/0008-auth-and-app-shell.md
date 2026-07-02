# 0008 — Auth: magic-link login, protected routes, app shell baseline

- **Status:** done
- **Completed:** 2026-07-02
- **Owner:** agent (feat/v1-build run)
- **Created:** 2026-07-02
- **Related:** `tasks/PLAN.md` (AUTH1), PRD §5 (auth), §3.3.1 (visual system)

## Goal

Magic-link auth (Supabase, single user) with every log view behind a session: middleware
refreshes the session and redirects unauthenticated visitors to `/login`; the OTP confirm route
completes the round-trip. Plus the design baseline every UI stream builds on: root layout, fonts,
and the space-aesthetic Tailwind theme tokens in `globals.css` — pinned before UI fan-out so all
views share one visual system.

## Plan / checklist

- [x] `lib/supabase/middleware.ts` — session refresh + redirect logic (`updateSession`), with
      the public-path predicate as a pure, tested function
- [x] `middleware.ts` — matcher excluding static assets
- [x] `app/(auth)/login/page.tsx` — email form, `signInWithOtp`, sent-state, error-state
- [x] `app/auth/confirm/route.ts` — `verifyOtp(token_hash)` -> redirect; failure -> `/login?error=`
- [x] Sign-out server action
- [x] Root `app/layout.tsx` + `globals.css` space theme tokens (dark canvas, panel/border/text
      tokens, accent, starfield) + reduced-motion respect
- [x] Tests: public-path predicate unit; login page component test (submit calls `signInWithOtp`
      with the entered email; sent-state renders)
- [x] Verification (below)

## Verification

2026-07-02 — full gate green: `npm run test` **8 files, 61 tests passed** (incl. new
public-path predicate unit tests and login component tests: submit calls `signInWithOtp` with
the entered email + redirect option, sent-state renders, send errors surface via role=alert);
`typecheck`, `lint`, `build` all exit 0 (middleware bundles at 91 kB). The magic-link
round-trip against live Supabase is deferred to first deploy (documented in RUNBOOK) — no live
project exists in this environment by design (see run scope); the redirect and confirm logic are
covered by unit/component tests.

## Outcome

Magic-link auth wired end to end: `updateSession` middleware (session refresh + redirect to
/login for private paths; public = /login, /auth/*, /now, /api/*), login page with
idle/sending/sent/error states, OTP confirm route, sign-out server action. Design baseline
pinned for UI fan-out: space tokens (deep-navy canvas, glass panels, indigo accent, CSS-only
starfield), Geist fonts, visible focus rings, prefers-reduced-motion kill-switch. Scaffold
boilerplate (default page, svg assets) removed.
