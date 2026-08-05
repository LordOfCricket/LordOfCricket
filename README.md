# Lord Of Cricket (LOC)

Lord Of Cricket is the digital home of a real grassroots cricket ground: match
scoring, official career statistics, and a public spectator experience, built
on top of a from-scratch, backend-authoritative cricket scoring engine — plus
the ground's own booking/canteen/facilities site.

Short name: **LOC**. (Never "CricVerse" — that name is retired.)

## Core capabilities

- **Authentication** — email/password accounts (player, staff, umpire roles), JWT sessions.
- **Player Profiles** — self-service profile setup, public player discovery and public profiles.
- **Teams** — team rosters, public team discovery and public team profiles with official records.
  Staff manage roster membership (add/remove a player from a team) directly from the team profile
  page — see `docs/ARCHITECTURE.md`'s Phase 13 notes.
- **Match Creation & Setup** — team selection, Playing XI (with captain/wicketkeeper), toss. Staff
  and approved umpires both reach match creation/setup/scoring through a single "Match Operations"
  hub (`/umpire`, linked from the account menu as "Manage Matches") — no manual URL typing needed.
- **Player Match Availability / RSVP** — a player marks AVAILABLE/NOT AVAILABLE for an upcoming
  match; the organizer sees every response while building the roster. Informational only — it
  never automatically sets the Playing XI, which remains fully organizer-authoritative.
- **Scoring Engine & Replay** — every delivery/event is persisted and the innings state is always
  reconstructed by replaying that log — never accumulated by a stateful counter.
- **Wagon Wheel** — shot-by-shot placement recorded per delivery.
- **Edit Score / Corrections** — a full correction-preview → apply → undo audit trail that replays
  history rather than patching totals.
- **Match Lifecycle** — upcoming → live → completed → finalized, with target/chase, innings break,
  and roster-aware result derivation (wins/losses/ties).
- **Career Statistics & Leaderboards** — official stats derived only from finalized matches.
- **Public Match Discovery** — a public `/matches` page (Live / Upcoming / Results) and a homepage
  feed, all reading the same authoritative data.
- **Professional Match Summary** — a full public scorecard/timeline/wagon-wheel view of any match.
- **Spectator Live Updates** — the open Match Summary page for a live match updates itself in
  real time over Socket.IO (one room per match, authoritative state only — never a client-computed
  delta), with visibility-aware/offline-aware HTTP polling as an automatic resilience fallback
  whenever the socket is disconnected — no manual refresh needed either way.
- **Professional Commentary** — a deterministic, template-based ball-by-ball commentary feed (dots,
  boundaries, extras, wickets, milestones, over/innings/match lifecycle), generated purely from the
  authoritative replay engine — never AI, never a second cricket engine — persisted in PostgreSQL,
  correction-aware (a historical Edit Score regenerates the affected commentary automatically), and
  live over the same Socket.IO room as the score.
- **Canteen** — a merged food-ordering system (menu, orders, live order status) for the ground.
  "One active order per user" is enforced by a MongoDB partial unique index, not just a
  same-process check — two near-simultaneous order requests can never both succeed (Phase 14 Part 2).
- **Ground Booking** — a real availability/reservation system for the ground itself: a public
  calendar (`GET /api/bookings/availability`), a homepage booking flow, "My Bookings," and staff
  schedule/blocking tools. PostgreSQL is authoritative (a `tstzrange` `EXCLUDE` constraint makes
  overlapping confirmed reservations impossible at the database level — see docs/ARCHITECTURE.md's
  Phase 14 section for the exact guarantee), with optional, best-effort Google Calendar
  synchronization that can never cause a double-booking even if it's misconfigured or down.
- **Umpire Requests** — a request/approval flow for umpire status.
- **Practice / Umpire Testing sandbox** (`/testing`) — an intentionally separate, client-only
  scoring engine for practicing scoring without touching real match data.

**Not implemented yet** (do not assume these exist): AI-enriched/AI-generated commentary wording
(Phase 12's commentary is deterministic and template-based, never AI — see
`docs/ARCHITECTURE.md` §12.10), tournament/points-table engine, fantasy cricket, guest (non-account)
booking, and custom-duration bookings (every booking is currently one fixed-length slot — see
`docs/TECHNICAL_DEBT.md`).

## Architecture overview

```
Browser (React)
      │
      ▼
Express API (/api)
      │
      ▼
Services  (orchestration, transactions)
      │
      ▼
Domain    (pure cricket rules — replay, statistics, corrections; zero I/O)
      │
      ▼
PostgreSQL   (official cricket truth: teams, players, matches, innings,
              deliveries, wickets, wagon wheel, corrections, statistics —
              PLUS commentary_entries, a deterministic PROJECTION of that
              truth, Phase 12 — never a second source of it)

MongoDB is used ONLY for the canteen (menu items, today's menu config,
orders) — it never stores cricket truth.

Socket.IO (one shared server, since before Phase 11 — canteen order/menu
updates) now ALSO carries cricket spectator updates via match:{id} rooms:
match:state (the authoritative live-state DTO) and match:commentary (Phase
12's deterministic commentary feed) — both published only after a
scoring/correction write has committed.
```

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full data-flow, replay/correction
design, the realtime transport (Socket.IO + polling fallback) design, and the commentary projection
(§12).

## Tech stack

- **Backend**: Node.js (ESM), Express, `pg` (PostgreSQL driver, no ORM for cricket data), Mongoose
  (MongoDB, canteen only), `jsonwebtoken`, `bcryptjs`, Socket.IO (canteen order/menu updates +
  cricket spectator match rooms + booking availability refresh), Cloudinary (uploads), `googleapis`
  (optional ground-booking Google Calendar sync, service-account auth), Node's built-in test runner
  (`node --test`).
- **Frontend**: React 19, React Router 7 (data router), Vite, Tailwind CSS 4, axios,
  `socket.io-client`, lucide-react icons, `eslint-plugin-react-hooks` with the React Compiler rule set.
- **Database**: PostgreSQL (cricket truth, users, canteen relational bits, ground bookings), MongoDB
  (canteen documents).

## Project structure

```
LordOfCricket/
├── client/                 React SPA
│   └── src/
│       ├── pages/          route-level screens
│       ├── components/     presentational + feature components, grouped by domain
│       ├── hooks/          data fetching, polling, auth, canteen sockets
│       ├── services/       one thin axios wrapper per API area
│       ├── models/         small pure display/formatting helpers (labels, enums)
│       ├── routes/         React Router config + auth guards
│       └── context/        AuthContext
├── server/                 Express API
│   └── src/
│       ├── routes/         Express routers (thin — just method+path→controller wiring)
│       ├── controllers/    request/response glue only
│       ├── services/       orchestration, transactions, cross-cutting rules
│       ├── domain/         pure cricket logic — scoring replay, statistics, corrections,
│       │                   match discovery/live-state DTOs, matchSummary, commentary generation,
│       │                   ground-booking availability/overlap/recommendation rules (booking/).
│       │                   Zero PostgreSQL imports.
│       ├── realtime/       Socket.IO cricket room join/leave + authoritative state/commentary
│       │                   publication, plus booking availability refresh rooms (transport only —
│       │                   zero cricket/booking rules, see docs/ARCHITECTURE.md)
│       ├── repositories/   parameterized SQL for the scoring/correction/commentary/booking domain
│       ├── scripts/        one-off maintenance scripts (e.g. commentary backfill/rebuild)
│       ├── models/         parameterized SQL for teams/players/matches/users (pre-Phase-3 naming;
│       │                   same role as repositories/)
│       ├── middlewares/    auth, role/scorer guards, centralized error handler
│       ├── config/         db pools, CORS allowlist, uploads, migrate/seed scripts
│       └── tests/integration/   real-PostgreSQL integration tests
├── docs/                   ARCHITECTURE.md, TECHNICAL_DEBT.md, API.md
└── package.json            root convenience script to run client+server together
```

## Local setup

Prerequisites: Node.js 20+, a PostgreSQL database, (optional) a MongoDB database for canteen
features.

```bash
git clone <repo>
cd LordOfCricket
npm install --prefix server
npm install --prefix client
```

### Environment variables

Copy the example files and fill in real values — **never commit real secrets**:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

`server/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `PG_USER`, `PG_HOST`, `PG_DATABASE`, `PG_PASSWORD`, `PG_PORT` | PostgreSQL connection |
| `MONGO_URI` | MongoDB connection (canteen only — the server still boots without it) |
| `CLIENT_ORIGIN` | Comma-separated list of allowed CORS origins |
| `JWT_SECRET` | Session-signing secret. **Required in production** — the server refuses to start in production without it (see `server/src/utils/jwt.js`) |
| `CRICAPI_KEY` | Optional — powers the homepage's external "India match" widget only; the widget degrades gracefully with no key |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Canteen menu-item image uploads |

`client/.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the Express API |
| `VITE_SOCKET_URL` | Base URL for the shared Socket.IO connection (canteen orders/menu + cricket spectator match rooms) |

Never put server secrets in a `VITE_`-prefixed variable — anything prefixed `VITE_` is bundled
into the public client build.

### Database setup

```bash
npm run db:migrate --prefix server   # creates/updates all tables (idempotent, see docs/ARCHITECTURE.md)
npm run db:seed --prefix server      # test accounts — refuses to run if NODE_ENV=production
npm run db:seed:players --prefix server
```

### Run

```bash
# from the repo root — runs client and server together
npm run dev

# or individually
npm run dev --prefix server
npm run dev --prefix client
```

### Tests

```bash
npm test --prefix server              # pure domain/unit tests — no database needed
npm run test:integration --prefix server   # real-PostgreSQL integration tests
```

Current verified baseline: **361 / 361** (180 unit + 181 integration). Two integration tests
require a reachable MongoDB and skip (not fail) when it's unavailable, consistent with MongoDB
being an optional dependency everywhere else in this app.

### Production build

```bash
npm run build --prefix client
npm start --prefix server
```

### Maintenance scripts

```bash
npm run commentary:rebuild --prefix server   # regenerate commentary for every innings (idempotent)
```

## Important architectural principles

1. **PostgreSQL is the only source of official cricket truth.** Deliveries and non-scoring events
   are appended to an immutable log; every derived figure (score, wickets, batting/bowling figures,
   career stats, team records, the live spectator view) is *replayed* from that log, never
   accumulated independently.
2. **Corrections rewrite history safely, not totals.** Editing a historical delivery re-runs the
   replay from that point forward inside one transaction and bumps a version counter — nothing
   downstream (career stats, team records, the live view) can go stale.
3. **The frontend never computes cricket truth.** Run rates, targets, results, and win/loss
   determination are always server-computed; React only formats strings for display.
4. **MongoDB never becomes a second source of cricket truth.** It is used exclusively for the
   canteen's flexible, order-lifecycle data.
5. **Public reads are explicit DTOs, never raw database rows** — no email/password/OTP/internal
   IDs are ever exposed by a public endpoint.
6. **Realtime publishes truth, never a delta.** A Socket.IO broadcast only ever happens *after* a
   scoring/correction transaction has committed, and it always carries the full, freshly-replayed
   authoritative state (the same DTO the HTTP live-state endpoint serves) — never a client-side
   "+4 runs" style delta, which a later historical correction would make unsafe to apply.
7. **Commentary describes cricket, it never decides it.** The commentary projection
   (`commentary_entries`) is generated purely from `replayInnings()` output — no shot type, ball
   line/length, or fielder is ever invented beyond what's authoritatively recorded — and if it ever
   disagrees with the replay engine, the projection is regenerated, never the cricket truth.

See `docs/ARCHITECTURE.md` for the full data-flow diagram and the correction-engine/realtime/
commentary walkthroughs.
