# LOC Technical Debt

Originally produced by the pre-Phase-11 project-wide cleanup audit, kept up to date through Phase
12 (Socket.IO cricket realtime, commentary projection). Classified by priority. Items marked
**RESOLVED** were found and fixed during the cleanup audit (see git history around this file's
introduction for the exact diff).

Intentional design decisions are called out explicitly as such — they are not bugs, and should not
be "fixed" by a future pass without a real product reason.

## P0 — Critical

None open at the time of this audit.

**RESOLVED — five content-management route groups had NO server-side authorization at all.**
`ground-photos`, `amenities`, `advertisements`, `partners` (POST/`/upload`/DELETE), and
`canteen/menu` (`PATCH /today`, `POST/PATCH/DELETE /master...`) accepted writes from any caller,
authenticated or not — the corresponding `/admin/*` client pages had no route guard either, but
that's irrelevant: these were directly callable by anyone who knew the URL, with no token required
(`GET` listing endpoints were and remain intentionally public). Fixed by adding
`requireAuth, requireRole('staff')` to every write route, matching the pattern already used for
canteen orders, and wrapping `/admin/photos`, `/admin/amenities`, `/admin/partners` in
`<RequireAuth>` client-side (consistent with the existing `/canteen/staff` precedent — no
client-side role gate exists anywhere in this app, role enforcement is the backend's job by
design). Verified via direct API calls: unauthenticated write now returns 401, staff-authenticated
write still succeeds, public `GET` is unaffected.

**RESOLVED — JWT silently fell back to a hardcoded, public secret.**
`server/src/utils/jwt.js` signed every session with `process.env.JWT_SECRET ||
'dev-only-insecure-secret-change-me'`. A production deployment that forgot to set `JWT_SECRET`
would have silently signed real login sessions with a secret visible in this repository, letting
anyone forge a valid token for any user. Fixed: the module now throws at load time if
`NODE_ENV=production` and `JWT_SECRET` is unset. Dev/test behavior is unchanged. Covered by
`server/src/utils/jwt.test.js`.

## P1 — Important

**RESOLVED (Phase 14 Part 1) — no per-match player availability/RSVP.** Fixed: `match_availability`
table + `/me/availability/:matchId` (player) + `/matches/:matchId/availability` (organizer/staff)
endpoints, surfaced on the player dashboard's Next Match card and the roster-building UI. See
`docs/ARCHITECTURE.md` §13.

**RESOLVED (Phase 14 Part 2) — canteen order placement's double-submission race window.**
`canteenOrder.model.js` now has a partial unique index on `{userId, hasActiveOrderFlag}`
(`hasActiveOrderFlag: true` only while an order is active) — MongoDB itself rejects a second
concurrent active order with a duplicate-key error (E11000), which `createOrder` translates into the
same `409` response as before. The `findOne` pre-check remains as a fast, friendly path, but the
index is now the actual source of correctness, verified by a real concurrent-insert integration test
(`canteenOrderConcurrency.integration.test.js`). No client-side submit lock was added — the fix is
authoritative at the database layer, matching this project's established idempotency approach.

**`react-router-dom` has a HIGH severity advisory** (RSC Mode CSRF Bypass Allows Action Execution
Before 400 Response — GHSA-qwww-vcr4-c8h2), reported by `npm audit` in `client/`. This app is a
client-only SPA (`createBrowserRouter`/`RouterProvider`, no React Server Components / framework
mode), so the specific RSC-mode attack surface is very likely not reachable here — but this has not
been rigorously verified against the advisory's exact conditions, and `npm audit fix --force` was
deliberately NOT run (it would downgrade `react-router-dom` — a breaking change requiring its own
regression pass). **Recommendation:** address in a dedicated, tested dependency-upgrade task, not
bundled into a cleanup pass.

**No rate limiting on `/api/auth/login` or `/api/auth/signup`.** No brute-force/credential-stuffing
protection currently exists on these endpoints. Not implemented in this cleanup (explicitly out of
scope — "do not implement enterprise rate infrastructure"), but worth a small, targeted limiter on
just these two routes in a future pass.

## P2 — Improvement

**`NO_RESULT` is a supported database value the app can never produce.**
`matches.result_type` CHECK constraint allows `'NO_RESULT'`, but
`domain/scoring/matchResult.js#RESULT_TYPES` only defines `['WICKETS', 'RUNS', 'TIE']`, and no
abandoned/rain-affected-match lifecycle exists to ever produce it. This is a real schema/domain gap
(not a bug — nothing is broken today, since the value is simply never written), documented here as
a known future lifecycle extension. Same applies to `cancelled`/`abandoned` match statuses — the
schema has no CHECK constraint on `matches.status` restricting it, but no code path ever sets
anything other than `upcoming`/`live`/`completed`/`finalized`.

**No permanent, team-level captain/wicketkeeper concept.** `is_captain`/`is_wicketkeeper` exist
only on `match_players` (per-match). There is no `teams.captain_player_id` or similar. Team
Profile (Phase 10 Part 2) and Match Summary (Phase 9) both deliberately show match-specific
captain/keeper markers rather than inventing a permanent one — documented design decision, not a
gap to silently "fill in."

**Two ball/over indexing conventions coexist** in the Match Summary read model
(`domain/matchSummary/buildInningsSummary.js`): fall-of-wickets entries are 0-indexed (matching the
DB/replay convention), while per-delivery `over`/`ball` display values used elsewhere in the same
response are 1-indexed. Both are faithfully reused from their original call sites (documented in
Phase 9) rather than unified into a third convention — a real inconsistency, low risk, cosmetic only.

**Static scorecard/timeline/wagon-wheel do not refresh every ~3s** on a live Match Summary page —
only the hot live panel does; the rest refreshes on page load and on lifecycle transitions
(innings break, second innings, completion). This is a deliberate Phase 10 Part 3 architecture
decision (Section 8 of `docs/ARCHITECTURE.md`), not an oversight — flagged here only so it isn't
"fixed" by accident later without re-reading that rationale.

**Team Profile's live-match card is not auto-refreshed** (neither polling nor Socket.IO). It shows
the live match at whatever freshness the page loaded at; the spectator would need to open the
linked Match Summary for live updates. Explicitly out of scope for both Phase 10 Part 3 and Phase
11 (Homepage + `/matches` LIVE tab + Match Summary only — Part 51 of the Phase 11 spec).

**The `/matches` LIVE tab and homepage featured match still use HTTP polling, not Socket.IO.**
Deliberate (Phase 11 Part 50/97): joining a socket room per card in a list of N live matches
doesn't scale the way one room per open Match Summary page does. They keep their existing ~20s/~30s
bounded polling cadence from Phase 10 Part 3 unchanged. Only the single, detailed Match Summary
page is Socket.IO-backed.

**No Redis adapter — Socket.IO is single-process.** Fine at current scale (one Node process);
horizontally scaling the API to multiple instances would require the `@socket.io/redis-adapter` (or
similar) so a broadcast from one process reaches spectators connected to another. Deliberately not
added (Phase 11 Part 54 — "do not add Redis," revisit only with real scaling evidence).

**No automated client-side tests for the Socket.IO/commentary hooks** (`useSocketMatchTransport.js`,
`useLiveMatch.js`, `useMatchCommentary.js`, `CommentaryPanel.jsx`) — this project has no existing
frontend test framework to extend (Phase 11/12 both relied on real-browser manual E2E instead,
documented in each phase's completion report). Worth introducing a frontend test runner (Vitest +
Testing Library would fit the existing Vite setup) if the client's automated coverage becomes a
priority.

**`join-match` has no per-socket rate limiting.** A public, unauthenticated spectator can call
`join-match` for any match id repeatedly; server-side validation (matchId must be a positive
integer, match must exist) bounds the cost of each attempt to one indexed PK lookup, but there is no
throttle on attempt *frequency*. Consistent with the project's existing no-rate-limiter stance
(see the P1 auth-endpoints item above) — revisit together if a rate limiter is ever introduced.

**OTP/Twilio is not implemented at all** — not even mocked. Auth is plain email + password +
JWT. The `twilio` npm package was a dependency with zero actual usage anywhere in `server/src`;
it has been removed as part of this cleanup (see git history). If SMS/OTP verification becomes a
real requirement, it needs to be built from scratch, not "finished."

**`models/` (matches/teams/players/users) and `repositories/` (scoring/correction domain) hold the
same architectural role under two different directory names**, a naming split from before the
scoring domain existed. Not renamed in this cleanup (would touch a large number of import
statements for a purely cosmetic gain) — recommend `repositories/` as the convention for any new
persistence module.

**Commentary generation is `O(n²)` in the number of prior log entries** (Phase 12 —
`generateInningsCommentary` replays `log.slice(0, i)` for every index rather than folding
incrementally, see `docs/ARCHITECTURE.md` §12.8). Deliberate: correctness/zero-drift-between-append-
and-rebuild first, and the measured real numbers (146-174ms to regenerate 148 entries from a 120-ball
innings) are nowhere near a problem at club-cricket lengths. Revisit only if a much longer format
(e.g. multi-day) is ever supported.

**Commentary produces no line for most `match_events` types** (Phase 12 — only `catch-dropped`,
`retire`, `penalty-runs` get a commentary row; `batsman-in`, `bowler-change`, `strike-swap`,
`appeal`, `review`, `drinks-break`, `rain-delay`, `injury`, `match-paused`/`match-resumed` do not).
Deliberate (Part 6: a small, meaningful taxonomy, not one line per possible administrative event) —
revisit only if a real product need for narrating one of these surfaces.

**No ball line/length/shot-type commentary** ("yorker", "cover drive", etc.) — LOC's scorer UI does
not currently capture that data, only wagon-wheel region and outcome. Phase 12 deliberately never
invents it (Part 86: truth over dramatic language). A future scorer-input enhancement capturing
line/length/shot type would be the prerequisite, not a commentary-layer change.

**Captain/wicketkeeper can only be designated at the moment a player is first added to a match
roster (Phase 13).** `match_players` has no update path once a row exists (`createMatchPlayer` is a
plain insert, no upsert) — the new Captain/Wicketkeeper picker on Match Setup
(`MatchRosterPage.jsx`) can therefore only offer players that are selected but not yet locked into a
saved roster. A match whose Playing XI was already fully saved before this phase (or before the
organizer decides on a captain) cannot have captain/WK retrofitted through the UI today. A small
`PATCH /matches/:matchId/match-players/:id` endpoint would close this gap if it becomes a real
friction point.

**RESOLVED (Phase 14 Part 3) — ground/facility booking was marketing-only.** Fixed: a real
availability/reservation system (`ground_bookings`, PostgreSQL `EXCLUDE` constraint for the
concurrency guarantee, homepage booking flow, My Bookings, staff schedule/blocking). See
`docs/ARCHITECTURE.md` §14. The homepage's old `mailto:` CTA is now a real "Book Ground" button.

**Canteen staff "Order History" tab (Phase 13) shows all orders, not just completed/cancelled
ones.** `GET /api/canteen/orders` only distinguishes `status=active` from "everything" — there is no
server-side "history only" (completed + cancelled) filter, so the History tab fetches the unfiltered
list and lets staff narrow it with a client-side status filter within the current page. Good enough
to close the "no way to review a past order" gap the audit found; a dedicated `status=history` server
filter (excluding active statuses) would make pagination more useful if this becomes a high-traffic
screen.

**RESOLVED (Phase 14 Part 2, as a side effect) — `canteenOrder` (MongoDB) had no index on
`userId`.** The new partial unique index on `{userId, hasActiveOrderFlag}` (added for the
concurrency fix, see P1 above) has `userId` as its leading field, so it now also serves every
plain `userId`-filtered query (`getActiveOrder`, `getOrderHistory`) as a prefix index — no separate
index was needed.

**Ground booking is fixed-slot only (Phase 14 Part 3) — no custom start/duration.** Every booking is
exactly `GROUND_SLOT_DURATION_MINUTES` (default 2 hours) long, chosen from a fixed grid. Deliberate
v1 scope (Part 11: "implement a clean configurable... policy rather than scattering constants" — not
"build a general-purpose arbitrary-duration scheduler"). A real need for half-length or multi-slot
bookings would be a natural, bounded follow-up (allow selecting N contiguous grid slots), not a
redesign.

**LOC match occupancy blocks a whole calendar day, not the match's actual hours (Phase 14 Part 3).**
`matches.match_date` is a single `TIMESTAMP` with no end time and no reliable duration signal
(`overs_per_innings` can be `null`) — see `docs/ARCHITECTURE.md` §14.2. Blocking the whole day is the
smallest *safe* policy (never a false "available"), at the cost of being overly conservative on
match days. Would need a real `match_date` + duration (or explicit end time) on `matches` to narrow.

**Ground booking has no guest/non-account flow and no payment.** Booking requires login (Part 17's
chosen model: public availability, login to confirm — the smallest flow consistent with this app's
existing auth architecture, matching canteen ordering). No payment integration exists or was
requested; confirmation is immediate or fails, never "pending approval."

**Google Calendar sync could not be live-verified against a real calendar in this environment** — no
`GOOGLE_SERVICE_ACCOUNT_*` credentials were available. The adapter (`googleCalendar.service.js`) is
implemented against the current `googleapis` service-account JWT flow and exercised for its
*absence* (booking succeeds with `google_sync_status: 'NOT_CONFIGURED'`, never blocks/breaks
anything) — but a real event actually appearing on a real calendar has not been manually confirmed.
Do this once real credentials are provisioned, before relying on it operationally.

## P3 — Future

**No caching layer (Redis or otherwise).** Every measured endpoint (match discovery ~2ms, live
state ~5ms even 125 deliveries deep, home feed ~7ms) is fast enough at current club scale that a
cache would add complexity without a measured problem to solve. Revisit only with real evidence.

**No API versioning scheme** (`/api/...`, not `/api/v1/...`). Fine at current single-client scale;
worth deciding before a second consumer (e.g. a mobile app) appears.

**No code-splitting on the frontend build** — the production JS bundle is a single ~735KB
(~196KB gzipped) chunk (Vite's build output warns on this). Not yet a measured user-facing problem;
`import()`-based route-level splitting would be the natural first step if it becomes one.

**No OpenAPI/Swagger spec** — `docs/API.md` is a hand-maintained markdown overview. Sufficient for
the project's current size; consider generating a formal spec if the API surface keeps growing.

## Explicitly NOT bugs (verified during this audit, noted so they aren't "rediscovered")

- **`POST /api/auth/signup`'s response does not leak `password_hash`.** It looked suspicious at a
  glance (unlike `login`, it doesn't call `toPublicUser()`), but `createUser()`'s `INSERT ...
  RETURNING` clause already scopes to public columns only — there was never a hash in the object
  to leak. Verified by reading `user.model.js`.
- **No SQL-injection-shaped code found.** Every dynamic `ORDER BY`/`SET` fragment in the codebase
  is built exclusively from small, internally controlled whitelists (e.g.
  `domain/matchDiscovery/categoryMapping.js`'s `DISCOVERY_ORDER`), never raw request input; every
  value is parameterized.
- **No route-ordering/shadowing bugs found** across `server/src/routes/*.js` — every
  static-segment route (`/discover`, `/home`, `/live-state`, `/profile`) that could collide with a
  `/:id`-shaped route is correctly registered before it.
- **No per-request database connections** — a single `pg.Pool` and a single Mongoose connection are
  created once at module load and reused everywhere.
- **The "india-match/featured 500" and "staff-without-linked-player 404" console errors** that
  appeared in every regression check throughout Phases 9–10 have been root-caused and addressed —
  see the "RESOLVED" section below. They were not silently accepted forever.

## RESOLVED during this cleanup (beyond JWT, above)

- **`GET /api/india-match/featured` returned a 500 whenever `CRICAPI_KEY` was unset or CricAPI was
  unreachable.** This is a genuinely external, unofficial widget (a different competition's score,
  unrelated to LOC's own cricket truth) — an outage or missing key is an expected degraded state,
  not a LOC server bug. `cricapi.service.js#getIndiaFeaturedMatch` now catches any failure and
  returns `null` (logged server-side only), which the existing frontend `IndiaMatchCard.jsx` already
  rendered identically to a failed request. No visible UI change; the noisy console 500 is gone.
- **Career stats requests for accounts with no linked player profile showed a misleading "Couldn't
  load career statistics" error with a Retry button that would always fail again.** `GET
  /api/me/stats` correctly 404s for such accounts (staff/umpire-only accounts legitimately have no
  player profile) — that HTTP status is correct REST semantics and was left unchanged.
  `useCareerStats.js` now distinguishes this specific 404 and both `CareerOverview.jsx` and
  `ProfilePage.jsx` render the existing `StatsEmptyState` instead of a misleading error+retry.
- **`OnboardingBanner.jsx`'s "Join a team" / "Respond to match invitations" / "Start building your
  cricket record" buttons, and the Navbar account menu's "My Teams"/"My Matches"/"My Statistics"
  links, silently did nothing** — they all `scrollIntoView`'d `#teams`/`#matches`/`#career`, but
  `PlayerDashboardPage.jsx` had no elements with those ids. Fixed by wrapping the corresponding
  dashboard sections with the expected ids.
- Stale **"Welcome to CricVerse."** branding text in `OnboardingBanner.jsx`, fixed to "Lord Of
  Cricket."
- **`.gitignore` was missing build outputs, `server/uploads`, logs, and OS junk** — hardened (no
  previously-tracked files were affected; verified via `git ls-files` before changing).
