# Deployment

Operational reference for running LOC in production. For the reasoning behind each hardening
decision below, see `docs/ARCHITECTURE.md` §19 (Phase 19 — Production Hardening) and §20 (Phase 20 —
Production Release).

## Environment variables

All variables are documented with inline comments in `server/.env.example` — copy it to `server/.env`
and fill in real values before deploying. Summary by category:

| Variable | Required? | Notes |
|---|---|---|
| `PORT` | No (defaults 5000) | |
| `NODE_ENV` | **Yes, set to `production`** | Gates the `JWT_SECRET` safety check (below) and disables dev-only fallbacks. |
| `CLIENT_ORIGIN` | **Yes** | Comma-separated allowed CORS origins. An empty/unset value fails CORS *closed* (blocks every origin), not open — verified. |
| `TRUST_PROXY` | Only if behind a reverse proxy | Set to `1` only when a real reverse proxy (Nginx/Render/Railway/etc) terminates TLS and sets `X-Forwarded-For`. Leaving this on with no real proxy in front lets a client spoof its own IP and bypass rate limiting entirely. |
| `PG_*` | **Yes** | PostgreSQL connection — the authoritative datastore. `PG_POOL_MAX` is optional (defaults to 10, pg's own default). |
| `MONGO_URI` | No | Optional cache/secondary store (canteen menu, AI insight cache). The server boots and every core feature works without it — a connection failure logs a warning, never blocks startup. |
| `JWT_SECRET` | **Yes in production** | The server **refuses to boot** in production without this set (`utils/jwt.js`) — it will never silently sign real sessions with the public dev fallback secret. Use a long, random value. |
| `CRICAPI_KEY` | No | Optional external India-match widget; degrades gracefully without it. |
| `CLOUDINARY_*` | Only if canteen menu images are used | |
| `GOOGLE_CALENDAR_ID` / `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | No | Optional ground-calendar sync. Booking works fully without it. |
| `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` | No | Optional AI Insight feature. Every page works without it (`{available:false}`). Never exposed to the client — every AI call originates server-side only. |
| `GROUND_*` | No | Ground operating policy (hours, slot length, booking horizon) — sensible defaults in `domain/booking/policy.js`. |

**Missing required variables fail fast, with a clear message.** `config/validateEnv.js` runs at
startup and, in production, refuses to boot if `JWT_SECRET`, any `PG_*`, or `CLIENT_ORIGIN` is unset
— the error names exactly which variable(s) are missing rather than surfacing as an opaque downstream
connection error several layers removed from the actual cause. Every other variable in the table
above is genuinely optional by design (the app boots and every core feature works without it) and is
deliberately NOT part of this check — making an optional integration mandatory here would be a
regression, not hardening.

## Health checks

- `GET /api/health` — **liveness**. Checks nothing external (no DB query) — "is the process up at
  all". Use this for a container/orchestrator's liveness probe.
- `GET /api/health/ready` — **readiness**. Checks a real PostgreSQL query; returns `503` if it fails,
  `200` if it succeeds. Also reports (informationally — never affects the status code) whether
  MongoDB, Google Calendar, and AI are currently connected/configured, e.g.:
  ```json
  { "status": "ready", "postgres": "connected", "optional": { "mongodb": "connected", "googleCalendar": "configured", "ai": "configured" } }
  ```
  Use this for a load balancer/orchestrator's readiness probe — an instance with Mongo down is still
  fully able to serve cricket scoring, booking, and tournaments, so readiness never depends on the
  optional services.

## Database setup

1. Create a PostgreSQL database (any host — Render/Railway/Fly.io/Supabase/a self-managed instance
   all work identically, since the app only needs standard `pg` connectivity).
2. Set `PG_USER`/`PG_HOST`/`PG_DATABASE`/`PG_PASSWORD`/`PG_PORT` in the environment.
3. Run `npm run db:migrate --prefix server` — applies `server/src/config/schema.sql`. Idempotent
   (every `CREATE TABLE`/`CREATE INDEX` is `IF NOT EXISTS`, migrations are additive `ALTER TABLE ...
   ADD COLUMN IF NOT EXISTS` style) — safe to re-run against an already-migrated database.
4. MongoDB is optional. If you want the canteen menu's flexible catalog storage and the AI Insight
   cache to actually persist (both degrade gracefully without it — see docs/ARCHITECTURE.md), set
   `MONGO_URI` to a real Atlas/self-hosted connection string and make sure the deploying environment's
   outbound IP is allow-listed on the Atlas cluster (the single most common real-world cause of
   "MongoDB connection failed" in this app's logs).

## Google Calendar setup (optional)

Booking works completely without this — only follow these steps if you want confirmed bookings to
appear on a real Google Calendar automatically.

1. In Google Cloud Console, create a **service account** (not OAuth — this is a server-owned
   operational calendar, never a customer's personal account) and enable the Calendar API for the
   project.
2. Generate a JSON key for the service account; take `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   and `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
3. `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must be pasted as a single line with literal `\n` sequences —
   the app unescapes them at runtime (a raw multi-line PEM can't survive a single-line `.env` value
   otherwise).
4. Create (or reuse) a Google Calendar for the ground, share it with the service account's email
   (Calendar settings → "Share with specific people" → grant "Make changes to events"), and set
   `GOOGLE_CALENDAR_ID` to that calendar's id (Calendar settings → "Integrate calendar").
5. Verify: create a real booking and confirm `googleSyncStatus` on the response is not
   `NOT_CONFIGURED`. If it's `CANCEL_FAILED`/an error string, check the service account actually has
   write access to that specific calendar.

## AI setup (optional)

Every page works completely without this (`{available:false, reason:'NOT_CONFIGURED'}`) — only
follow these steps if you want the AI Insight narrative sections to actually generate.

1. Get an Anthropic API key (console.anthropic.com).
2. Set `AI_PROVIDER=anthropic`, `AI_API_KEY=<your key>`, `AI_MODEL=claude-sonnet-5` (or another
   current Claude model id).
3. Never set an `AI_*` variable on the client (`client/.env*`) — every AI call originates
   server-side only; the key must never reach the browser.
4. Verify: `GET /api/matches/:id/ai-insight` for a finalized match should return
   `{"available":true, ...}` instead of `NOT_CONFIGURED`.

## Deploying — platform notes

LOC is a standard Node/Express API + a static Vite SPA + PostgreSQL (+ optional MongoDB). No platform
is required by the architecture; pick whichever fits. Concrete config included in this repo:

- **Frontend (static SPA) — Vercel**: `client/vercel.json` sets the build/output directory and
  rewrites every path to `index.html` (required for client-side routing — without it, a direct visit
  to e.g. `/matches` 404s at the host level before React Router ever loads).
- **Frontend (static SPA) — Netlify / Render Static Site**: `client/public/_redirects` (copied
  verbatim into `client/dist` by the Vite build) provides the same SPA-fallback rewrite; both
  platforms auto-detect this file.
- **Backend — any container platform (Railway / Fly.io / Render Web Service / self-hosted)**:
  `server/Dockerfile` — multi-stage-free, `node:20-alpine`, `npm ci --omit=dev`, runs `npm start`,
  includes a container-level `HEALTHCHECK` hitting `/api/health`. Not required — Railway/Render also
  auto-detect a plain Node app (`npm install` + `npm start`) with no Dockerfile at all; the Dockerfile
  exists for platforms/workflows that specifically want a container and to pin the exact Node version
  (`node:20-alpine`, matching the `engines.node` field in both `package.json`s).
- **Backend build/start commands** (for a non-container platform): build command `npm ci` (or
  nothing — no compile step), start command `npm start` (→ `node src/server.js`).
- **Frontend build/start commands**: build command `npm run build`, output directory `dist`, no
  start command needed (static files only).

## Pre-deploy checklist

- [ ] `NODE_ENV=production` and a real, random `JWT_SECRET` are set — the server will refuse to start otherwise.
- [ ] `CLIENT_ORIGIN` lists the real deployed frontend origin(s), no trailing slashes, no wildcards.
- [ ] `TRUST_PROXY=1` set **only if** a real reverse proxy is in front of this process.
- [ ] `PG_*` point at the production database; `npm run db:migrate --prefix server` has been run against it.
- [ ] `npm test --prefix server`, `npm run test:integration --prefix server`, and `npm test --prefix client` all pass.
- [ ] `npm run build --prefix client` completes with no chunk-size warning.
- [ ] `npm run lint --prefix client` is clean.
- [ ] `GET /api/health/ready` returns `200` with `"postgres":"connected"` once deployed.
- [ ] SPA fallback routing verified: a direct browser visit to a non-root path (e.g. `/matches`) loads the app, not a 404 from the static host.
- [ ] Confirm `server/.env` and `client/.env*` are not committed (already gitignored — `client/.env.production` is the one intentional exception, and it holds no secret, only the public API URL).
- [ ] If Google Calendar / AI are intended to be live, confirm their `optional` state in `/api/health/ready` shows `configured`, not just that env vars are set (a bad key still shows as configured but will fail on first real use — see each section's own "Verify" step above).

## Backup & restore

**PostgreSQL is the sole source of truth for every core feature** (scoring, players, teams,
tournaments, booking) — see `docs/ARCHITECTURE.md` principle #1. Back it up like you would any
production relational database: this app does not implement its own backup mechanism, and shouldn't
— that's the hosting platform/database provider's job, not application code's.

- **Managed Postgres (Render/Railway/Supabase/RDS/etc)**: enable the provider's automated daily
  backups and point-in-time recovery if offered. This is almost always a dashboard toggle, not
  something to build.
- **Self-managed Postgres**: `pg_dump` on a schedule (cron), stored off-box. Restore with `pg_restore`
  (or `psql < dump.sql` for a plain-text dump) against a fresh database, then point `PG_*` at it.
- **MongoDB**: optional and non-authoritative (canteen menu catalog, AI insight cache — both are
  either re-enterable by staff or regenerable on demand). Losing it is an inconvenience, never a data
  -loss incident for LOC's actual cricket record. Back it up if convenient (most managed Atlas tiers
  include automated backups by default); not a release blocker if you don't.
- **Uploaded files** (`server/uploads/` — canteen images, ground photos not served via Cloudinary):
  local disk on whatever host runs the server. If the platform's filesystem is ephemeral (most
  container platforms are — a redeploy wipes it), these are lost on redeploy today. Not addressed in
  this phase (see Known Limitations) — Cloudinary already exists as the intended path for images that
  need to survive redeploys; this is only relevant for the subset of uploads that bypass it.

## Disaster recovery

- **Postgres is down / unreachable**: `GET /api/health/ready` reports `503`. The server itself
  refuses to start at all if Postgres is unreachable at boot (`connectPostgres()` exits the process)
  — a process manager restarting it in a loop is the correct behavior until Postgres is back, not a
  bug to silence.
- **The server process crashes** (an uncaught exception): logged in full (`utils/logger.js`) then the
  process exits — run it under a supervisor (pm2/systemd/the platform's own restart policy) so it
  comes back up automatically into a known-good state rather than continuing in a corrupted one.
- **MongoDB / Google Calendar / AI go down**: no recovery action needed — every core feature already
  works without them, by design (see docs/ARCHITECTURE.md). `/api/health/ready`'s `optional` block
  shows their state for visibility, but never fails readiness because of them.
- **A bad deploy needs rolling back**: this app has no in-place schema-downgrade tooling (migrations
  are additive/idempotent, not reversible) — roll back by redeploying the previous known-good build
  artifact/image against the same database. A migration that only ever adds tables/columns (this
  project's established pattern — see `schema.sql`'s `IF NOT EXISTS` style throughout) is safe to
  leave applied even after rolling the application code back.

## Release checklist

1. Run the full pre-deploy checklist above.
2. Tag the release in git.
3. Deploy the backend first, then the frontend (the frontend is a static build that only ever calls
   the backend's already-stable API surface — deploying backend-first avoids a brief window where a
   newer frontend calls an older backend for a route that doesn't exist yet; this app has never
   needed strict version-lockstep between them beyond that ordering).
4. Confirm `GET /api/health/ready` is `200` in production.
5. Smoke-test the deployed frontend: homepage loads, login works, one public page (e.g. `/matches`)
   loads with real data.
6. Watch the server logs for the first few minutes after traffic starts flowing — `utils/logger.js`
   surfaces anything unexpected as a structured `error`-level line.

## Logging

Every log line is a single JSON object on stdout (`info`/`warn`) or stderr (`error`) —
`utils/logger.js`. No external log service is wired up; pipe stdout/stderr to whatever the hosting
platform already collects (most PaaS providers do this automatically). Never logs passwords, tokens,
or secrets. What gets logged: server startup, Postgres/Mongo connect success/failure, the Postgres
pool's idle-client errors, uncaught exceptions and unhandled promise rejections (then the process
exits on an uncaught exception — let your process manager/orchestrator restart it into a known-good
state), AI provider failures, Google Calendar sync failures, booking conflicts, audit-log/notification
write failures, and every rate-limit trip.

## Rate limiting — single-instance caveat

`express-rate-limit`'s default in-memory store is correct for LOC's current single-instance
deployment. **If you ever run more than one server instance behind a load balancer**, the in-memory
store no longer works correctly (each instance counts independently, so the effective limit
multiplies by instance count) — you would need to swap in a shared store (e.g. a Redis-backed store)
at that point. Not needed today; noted here so it isn't rediscovered the hard way.

## Process management

The server exits the process (`process.exit(1)`) on: a failed Postgres connection at startup, or an
uncaught exception at runtime. Both are deliberate — continuing in either state is worse than a clean
restart. Run the process under a supervisor (pm2, systemd, Docker's own restart policy, or your
platform's equivalent) so it comes back up automatically.

## What this app does not need

No CDN configuration, no server-side rendering, no separate build step for the API beyond `npm ci`.
The client is a static Vite build (`npm run build` → `client/dist`) servable from any static host or
the same origin as the API. No secrets are ever needed on the client beyond the two public
`VITE_*` values already documented in `client/.env.example`.
