# RUNBOOK — taking prog-log live

Everything the code cannot do for you: account creation, secrets, and wiring. Follow in
order; each step says where every value comes from. When you finish, `.env.local` (and the
Vercel project env) contains a real value for **every** key in [`.env.example`](../.env.example).

The app runs entirely on free tiers: Vercel Hobby, Supabase Free, Discord, GitHub Actions.

---

## 0. Local sanity check (5 min)

```bash
npm ci
npm run typecheck && npm run lint && npm run test && npm run build
```

All four must exit 0 before you deploy anything. Tests run against an embedded Postgres
(ADR-0006) — no Docker or Supabase account needed for this step.

## 1. Supabase project

1. Create a project at [database.new](https://database.new) (Free plan, pick a region near
   you). Save the **database password** it generates.
2. From **Project Settings → API**, collect:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never in
     the browser; RLS does not apply to it)
3. Apply migrations from your machine:

   ```bash
   npx supabase login                       # one-time, opens browser
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push                     # applies supabase/migrations/*.sql
   ```

4. Seed (optional but recommended — gives the five starter Projects):

   ```bash
   psql "$(npx supabase status 2>/dev/null | grep 'DB URL' || true)" # local only
   # against the hosted project, use the connection string from
   # Project Settings → Database, then:
   psql "<connection-string>" -f supabase/seed.sql
   ```

5. **Auth (magic link).** In **Authentication → Providers → Email**: leave email enabled,
   disable signups if you want the app single-user after you create your account
   (**Authentication → Settings → Allow new users to sign up → off** once you're in).
   In **Authentication → URL Configuration** set:
   - Site URL: `https://log.aidanchien.com`
   - Redirect URLs: `https://log.aidanchien.com/auth/confirm`, plus
     `http://localhost:3000/auth/confirm` for local dev.
6. Sign in to the deployed (or local) app once via magic link, then grab your user id from
   **Authentication → Users** → `OWNER_USER_ID`. The Discord and Apple Shortcut capture
   paths write Entries as this user.
7. After the project exists, regenerate DB types and diff against the hand-maintained file
   (ADR-0006): `npx supabase gen types typescript --linked --schema public` vs
   `lib/database.types.ts`. They should match; commit any drift.

## 2. Vercel project + domain

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (framework:
   Next.js — defaults are fine; `vercel.json` only adds the cron).
2. **Project → Settings → Environment Variables**: add every key from `.env.example`
   with production values (the table below maps each one). Mark the secrets
   (service-role, tokens, secrets) as *Sensitive*.
3. **Domain**: Project → Settings → Domains → add `log.aidanchien.com`. At your DNS
   provider add the CNAME Vercel shows (`cname.vercel-dns.com`). Set
   `NEXT_PUBLIC_SITE_URL=https://log.aidanchien.com`.
4. **Cron**: `vercel.json` schedules `GET /api/cron/digest` daily at **12:00 UTC**
   (= 08:00 America/Toronto in summer, 07:00 in winter). Set a `CRON_SECRET` env var
   (`openssl rand -hex 32`); Vercel automatically sends it as a bearer token on cron
   invocations, and the route rejects anything else with 401.
   **ADR-0004 caveat:** the cron hour is fixed UTC; changing the stored timezone in app
   settings does *not* move the digest hour — edit `vercel.json` if you want a different
   local hour.
5. Deploy (push to `main`). Verify: `https://log.aidanchien.com/login` loads, magic link
   round-trips, and `https://log.aidanchien.com/now` renders signed-out.

## 3. Discord capture (`/log` from anywhere)

1. Create an application at the
   [Discord Developer Portal](https://discord.com/developers/applications):
   - **General Information → Public Key** → `DISCORD_PUBLIC_KEY`
   - **General Information → Application ID** → `DISCORD_APPLICATION_ID`
   - **Bot → Reset Token** → `DISCORD_BOT_TOKEN` (used *only* by the registration
     script below, never at runtime)
2. Your own user id: Discord → Settings → Advanced → Developer Mode on, right-click
   yourself → Copy User ID → `DISCORD_OWNER_ID`. The route rejects every other user.
3. Register the `/log` command (one-shot; re-running overwrites in place):

   ```bash
   node --env-file=.env.local scripts/register-discord-command.mjs
   ```

4. Point Discord at the deployed route: **General Information → Interactions Endpoint
   URL** → `https://log.aidanchien.com/api/discord`. Discord PINGs it on save; the route
   answers PONG — if the save succeeds, signature verification is working.
5. Install the app to your server (or as a user app): **Installation** page → add the
   `applications.commands` scope → open the install link.
6. **Daily Throwback digest**: in the Discord channel that should receive it →
   channel settings → Integrations → Webhooks → New Webhook → copy URL →
   `DISCORD_DIGEST_WEBHOOK_URL`. Empty-pool days post nothing.

## 4. Apple Shortcut capture

1. Generate the bearer secret: `openssl rand -hex 32` → `SHORTCUT_SECRET` (set it in
   Vercel env too).
2. On the iPhone/Mac: Shortcuts → new Shortcut →
   - Action **Get Contents of URL**: `https://log.aidanchien.com/api/log`, Method POST,
     Headers `Authorization: Bearer <SHORTCUT_SECRET>`, `Content-Type: application/json`,
     Request Body JSON:
     `{"project": "<Ask Each Time>", "time": "<Choose from small|medium|large>",`
     `"milestone": "<Ask Each Time, allow empty>"}`
   - Add it to the home screen / share sheet.
3. Errors come back as JSON: unknown project → 404 with a did-you-mean hint (resolution
   never guesses); bad secret → 401; bad `time` → 400.

## 5. GitHub Actions keep-alive

Supabase Free pauses projects idle for ~7 days; `.github/workflows/keepalive.yml` pings
PostgREST twice a week. In the GitHub repo → Settings → Secrets and variables → Actions,
add:

- `SUPABASE_URL` — same value as `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` — same value as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then run the workflow once by hand (Actions → keepalive → Run workflow) to confirm green.

## 6. Env var reference

| Key | Where it comes from | Used by |
|-----|--------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | browser + server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | browser + server (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | admin client (capture, digest, /now) |
| `NEXT_PUBLIC_SITE_URL` | your domain | magic-link redirects |
| `OWNER_USER_ID` | Supabase → Authentication → Users (after first login) | Discord/Shortcut writes, /now |
| `DISCORD_PUBLIC_KEY` | Dev Portal → General Information | `/api/discord` signature check |
| `DISCORD_APPLICATION_ID` | Dev Portal → General Information | command registration script |
| `DISCORD_BOT_TOKEN` | Dev Portal → Bot | command registration script only |
| `DISCORD_OWNER_ID` | Discord client → Copy User ID | `/api/discord` owner gate |
| `DISCORD_DIGEST_WEBHOOK_URL` | channel → Integrations → Webhooks | `/api/cron/digest` |
| `SHORTCUT_SECRET` | `openssl rand -hex 32` | `/api/log` bearer check |
| `CRON_SECRET` | `openssl rand -hex 32` (set in Vercel env) | `/api/cron/digest` gate |

GitHub Actions secrets (repo settings, not Vercel): `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## 7. Local development

```bash
cp .env.example .env.local        # fill in the values from above
npm run dev                       # http://localhost:3000
```

Local against the hosted Supabase project works fine (magic links redirect to
localhost if you added the redirect URL in step 1.5). For a fully offline stack,
`npx supabase start` (Docker) brings up Postgres + Auth + PostgREST locally; point the
`NEXT_PUBLIC_SUPABASE_*` vars at the values it prints, and apply migrations with
`npx supabase db reset` (runs `supabase/migrations` + `supabase/seed.sql`).

## 8. Post-launch checklist

- [ ] Magic-link login round-trips on the production domain
- [ ] Quick add writes an Entry; re-logging the same day keeps the peak Time Commitment
- [ ] `/log` in Discord: autocomplete lists your Projects; a log gets an ephemeral confirm
- [ ] Apple Shortcut logs from the share sheet
- [ ] `/now` renders signed-out; nothing private (no Descriptions) is visible
- [ ] Next morning: digest posted to the Discord channel (or nothing, if no Milestones yet)
- [ ] GitHub Actions keepalive ran green (check after Monday/Thursday 09:17 UTC)
