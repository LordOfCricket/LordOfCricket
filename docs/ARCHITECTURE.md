# LOC Architecture

## 1. Layering

```
routes/          Express Router wiring only (method + path -> controller). No logic.
controllers/     Extract/validate request shape, call one service function, shape the response.
services/        Orchestration: transactions, cross-cutting rules, calls into domain/ + repositories/.
domain/          Pure functions. No pg/mongoose imports. Independently unit-testable.
repositories/    Parameterized SQL for the Phase 3+ scoring/correction domain (innings, deliveries,
  & models/      match_events, wickets, wagon_wheel_shots, score_corrections). `models/` holds the
                 same role for teams/players/matches/users (an earlier naming convention, kept as-is
                 rather than renamed for aesthetics — see docs/TECHNICAL_DEBT.md).
```

Controllers are intentionally thin everywhere in this codebase — none of them contain SQL or
cricket-rule branching.

## 2. Data flow (the authoritative path)

```
Scorer records a delivery
        │
        ▼
POST /api/innings/:id/deliveries   (requireAuth + requireScorer)
        │
        ▼
scoring.service.js#recordDelivery
   1. lock the innings row (SELECT ... FOR UPDATE)
   2. idempotency check (clientActionId)
   3. optimistic-concurrency check (expectedVersion vs innings.version)
   4. load the full delivery/event log for this innings
   5. replayInnings(log)                      <- pure domain function
   6. validateDeliveryInput(...)               <- pure domain function
   7. insert the new delivery row
   8. replayInnings(log + newDelivery)         <- SAME pure function, re-run
   9. write back the derived/cache columns on `innings` (runs, wickets,
      legal_balls, striker/non-striker/bowler, is_free_hit_next) and bump version
  10. commit
        │
        ▼
Every reader (live scorer, Match Summary, public match cards, career stats,
team records, the spectator live-state endpoint) either reads those cache
columns directly, or calls the SAME getInningsState()/replayInnings() path
to recompute a richer view. There is exactly one cricket engine
(`server/src/domain/scoring/replay.js`) — every read model is a projection
of its output, never a second implementation of cricket rules.
```

## 3. The replay engine

`server/src/domain/scoring/replay.js` exports `replayInnings(log, seed, format)` — a pure
fold over a chronologically ordered array of delivery/event entries. Given the same log, seed,
and format, it always produces the same derived state (runs, wickets, legal balls, striker/
non-striker, batting/bowling figures, fall of wickets, partnerships, free-hit state). No
database access happens inside it.

Key properties:

- **Bowler is authoritative input, not derived** — each delivery entry carries its own
  `bowlerMatchPlayerId`, stamped by the scorer at record time. Correcting an earlier delivery's
  runs/wicket never reassigns who bowled a later over, because bowler was never computed from
  anything.
- **Striker/non-striker are purely mechanical** — a function of run-parity and explicit
  `batsman-in`/wicket events.
- **`ballsPerOver` is a format parameter everywhere**, never hardcoded — the production engine
  supports non-6-ball overs.
- **All-out threshold is roster-aware**: `battingTeamPlayingXiCount - 1`, not a hardcoded 10 — LOC
  supports non-11-a-side club matches.

## 4. The correction engine (Edit Score)

```
Original delivery (several balls/overs in the past)
        │
        ▼
POST /corrections/preview   -> previewCorrection(log, seed, format, entryId, patch)
   patches ONE entry, re-runs replayInnings on the patched log,
   diffs before/after to report exactly which downstream deliveries/
   dismissed players actually changed (never a blind "everything after
   this index changed")
        │
        ▼
POST /corrections            -> applyCorrection (correction.service.js)
   same replay, inside a transaction: writes the corrected delivery/event,
   re-derives every cache column on `innings`, bumps `version`,
   inserts an immutable score_corrections audit row
        │
        ▼
Every subsequent read (scorer, Match Summary, live spectator state, career
stats once finalized) is simply a fresh replay/read of the now-authoritative
log — there is no separate "apply a delta" step anywhere.
```

`score_corrections` rows are append-only (an undo creates a NEW row with before/after swapped and
`undoes_correction_id` set — the original correction is never mutated or deleted), so the full
correction history of a match is always reconstructable.

## 5. Match & innings lifecycle

```
matches.status:   upcoming -> live -> completed -> finalized
innings.status:   not_started -> live -> completed
```

- `live` covers BOTH "an innings is being bowled" and "innings break" (innings 1 finished, innings
  2 not yet started) — the break is a *derived* sub-state, not a separate persisted status.
- A match becomes `completed` the instant innings 2's result is decided (`maybeCompleteInnings` in
  `scoring.service.js`), in the SAME transaction as the delivery/correction that decided it.
- `finalized` is a one-way lock (no un-finalize path) — reachable only from `completed`.
  `correction.service.js` refuses any correction once `finalized`.
- Result derivation (win/loss/tie, margin) lives in one pure function,
  `domain/scoring/matchResult.js`, reused by both the live completion path and the correction
  re-derivation path — never duplicated.

## 6. Statistics (career & team)

Both **official player career statistics** (Phase 7) and **official team records** (Phase 10 Part
2) apply the identical rule: **finalized matches only**. A completed-but-unfinalized match is
visible in public match discovery/results, but contributes to no official statistic until
finalized — verified explicitly by integration tests (`STATS S9`, and the Part 2 finalization
tests).

Team-scoped statistics ("top run scorer for this team", win/loss/win%) are derived from
**historical match participation** (`match_players.team_id` as recorded at match time), never from
a player's *current* team (`players.team_id`) — a player who transfers teams keeps their historical
per-team stats attached to whichever team they actually represented in each finalized match.

## 7. Public read models

| Concern | Endpoint | Notes |
|---|---|---|
| Match discovery list | `GET /api/matches/discover` | Category (LIVE/UPCOMING/RESULTS) + pagination; reads `innings` cache columns, no replay |
| Homepage feed | `GET /api/matches/home` | Featured live + bounded upcoming/results previews |
| Full match summary | `GET /api/matches/:id/summary` | Full scorecard/timeline/wagon-wheel; one replay per innings |
| Spectator live state | `GET /api/matches/:id/live-state` | Lightweight HOT-data-only DTO, meant to be polled every ~3s |
| Team discovery/profile | `GET /api/teams/discover`, `GET /api/teams/:id/profile` | Current squad vs. historical participation kept explicitly separate |
| Player discovery/profile/stats | `GET /api/players`, `/:publicPlayerId`, `/:publicPlayerId/stats` | Public, finalized-only stats |
| Leaderboards | `GET /api/stats/leaderboards/:metric` | Qualification rules centralized in `domain/statistics/leaderboardConfig.js` |

Every one of these is an explicit DTO built by a `domain/**/build*.js` pure function — never a raw
`SELECT *` row handed to the client. None of them expose `email`/`user_id`/`password`/OTP/canteen
data (enforced by dedicated privacy tests in `tests/integration/*`).

## 8. Data classification for the live spectator view (Phase 10 Part 3)

| Class | Examples | Refresh cadence |
|---|---|---|
| HOT | score, wickets, overs, striker/non-striker/bowler, this over, chase | ~3s while live, via `useLiveMatch` |
| WARM | full scorecard, timeline, partnerships, fall of wickets | on page load + on lifecycle transition (innings break, second innings, completion) — never every 3s |
| COLD | teams, venue, format, toss, Playing XI, wagon wheel | fetched once |

The `/matches` LIVE tab refreshes every ~20s while visible; the homepage every ~30s. All cadences
pause while the browser tab is hidden and refresh immediately on becoming visible again.

## 9. Spectator live transport (Phase 11: Socket.IO primary, HTTP polling fallback)

```
client/src/hooks/useSocketMatchTransport.js     <- Socket.IO transport (join/leave match:{id},
   (connect/disconnect, join-match/leave-match,     receive match:state, report connected/data)
    match:state -> data, tagged by matchId)
        │
        ├──────────────────────────────────────────────┐
        ▼                                                ▼
client/src/hooks/useVisibilityAwarePolling.js     (still exists, unchanged internals)
   active ONLY while the socket is disconnected — the resilience fallback
        │                                                │
        └──────────────────────┬─────────────────────────┘
                                ▼
client/src/hooks/useLiveMatch.js   <- merges both transports: whichever is
   verifiably NEWER by (inningsId, version) wins (isNewer()); cadence
   selection, stop-on-terminal-status; still zero cricket math
        │
        ▼
client/src/components/live-match/*   <- presentational only, UNCHANGED from
                                         Phase 10 Part 3 (Part 25 target met:
                                         no component ever touches socket.io)
```

`useLiveMatch`'s public contract — `{ liveState, loading, connectionStatus, lastUpdatedAt, refresh,
isPolling }` — is **exactly the same shape** it was under pure polling. Every consumer
(`LiveMatchPanel` and its children) needed zero changes.

## 10. Socket.IO — one shared server, two feature domains

`server/src/server.js` creates ONE Socket.IO server (`io`), attached to every request as `req.io`.
Two independent, additive `io.on('connection', ...)` registrations share it:

- **Canteen** (pre-existing): `join-staff-room` / `join-order-room` / `join-user-room`, emitted
  from `canteenOrder.controller.js` / `canteenMenu.controller.js`. Untouched by Phase 11.
- **Cricket** (`server/src/realtime/cricketRealtime.js#registerCricketRealtime`): `join-match` /
  `leave-match` / `match:state` / `match:error`, on `match:{matchId}` rooms.

Socket.IO fires every registered `connection` listener for each new socket, so adding the cricket
listener required zero changes to the canteen listener's own code — verified by a full regression
pass with no canteen behavior change.

## 11. Cricket realtime implementation

### 11.1 Files

- `server/src/realtime/cricketRealtime.js` — `registerCricketRealtime(io)` (join/leave validation)
  and `publishMatchState(io, matchId, reason)` (the one centralized publication boundary — Part 77).
  Zero cricket rules; `publishMatchState` re-reads state via the exact same
  `liveMatch.service.js#getLiveMatchState` the HTTP endpoint uses.
- `server/src/server.js` — registers the module alongside the existing canteen handlers.
- `server/src/controllers/{scoring,correction,match}.controller.js` — call `publishMatchState`
  (fire-and-forget, after `res.json(...)`) once their service call has returned successfully.
- `server/src/services/{scoring,correction}.service.js` — additive `matchId` field on
  `recordDelivery`/`recordEvent`/`applyCorrection`'s existing return objects (the controller needs
  it to know which room to publish to; nothing about the cricket logic itself changed).
- `client/src/hooks/useSocketMatchTransport.js` — the Socket.IO client transport.
- `client/src/hooks/useLiveMatch.js` — merges socket + polling (Section 9).
- `client/src/services/socket.js` — the shared `socketUrl` constant (canteen's
  `canteenOrderStatus.model.js` now re-exports from here instead of defining its own copy).

### 11.2 Files deliberately NOT touched

`domain/scoring/replay.js`, `domain/liveMatch/buildLiveMatchState.js`,
`services/liveMatch.service.js` (its exported function is called, not modified),
`components/live-match/*` (all presentational, zero socket awareness),
`GET /api/matches/:id/live-state` (still exists, still the resilience-fallback data source).

### 11.3 Event contract (exactly what ships — no delta events)

| Event | Direction | Payload |
|---|---|---|
| `join-match` | client → server | `{ matchId }` |
| `leave-match` | client → server | `{ matchId }` |
| `match:state` | server → room | the live-state DTO (`match`, `result`, `target`, `currentInnings`) plus `{ matchId, reason }` |
| `match:error` | server → client | `{ message }` — invalid/missing matchId, match not found |

`reason` ∈ `delivery | event | correction | correction_undo | lifecycle | match_completed` — set by
the calling controller, **informational only** (visible in dev tooling/future logging). The client
never branches on it (Part 7) — `useSocketMatchTransport` stores whatever `match:state` payload
arrives, full stop. No `run:added`/`wicket:taken`-style per-outcome events exist — a wide, a six, a
wicket, and a full historical correction all produce the identical shape of message: the complete
current truth.

### 11.4 Transaction boundary (verified commit points)

- Deliveries/events: `scoring.service.js#recordDelivery` / `#recordEvent` — `publishMatchState` is
  called from the CONTROLLER, which only runs after `await scoringService.recordDelivery(...)`
  has already returned (i.e. strictly after that function's internal `COMMIT`). A thrown
  `ScoringError` (validation failure, version conflict) never reaches the publish call.
  Idempotent replays (`result.idempotentReplay === true`) are explicitly skipped — Part 36.
- Corrections/undo: same pattern via `correction.service.js#applyCorrection`.
- Lifecycle: `match.service.js#startMatch` / `#finalizeMatch` — publishes once the updated match
  row is returned.

`publishMatchState` itself independently RE-READS the state from PostgreSQL (via
`getLiveMatchState`) rather than trusting anything the write path had in memory — so even if two
writes' publishes overlap in flight, each broadcast reflects genuinely fresh data at the moment it
runs, never a stale snapshot.

### 11.5 Idempotency

Verified by integration test (`R36`): retrying an already-applied `clientActionId` returns
`{idempotentReplay: true}` from the service, and the controller's `maybePublish` helper skips
publishing entirely for that case — a network retry never produces a second visible broadcast.

### 11.6 Versioning / out-of-order protection

`currentInnings.version` (and `currentInnings.id` for the innings-transition case) is exposed in
every `match:state` payload. `useLiveMatch#isNewer()` is the ONE place both transports (socket and
polling fallback) get reconciled: whichever has the higher `(inningsId, version)` wins, regardless
of which transport it arrived through or when. An innings-1 → innings-2 transition (version resets
to a small number) is handled correctly because a *different* `inningsId` always wins outright,
never compared against the old innings' version number.

### 11.7 Post-commit publish failure

`publishMatchState` wraps its work in try/catch and only `console.error`s on failure — it never
throws back to the controller. A dead socket server, a transient read failure, anything: the
scoring/correction HTTP response the scorer sees is completely unaffected (Part 78/79), verified by
`R8`/`R9` (a null `io` and a publish for a nonexistent match are both safe no-ops).

### 11.8 Room isolation & no server-side spectator state

Verified by integration test `R5`: publishing to `match:101` never reaches a socket only in
`match:202`'s room. No `Map`/global registry of "who's watching what" is kept anywhere — Socket.IO's
own room membership is the only such state, and it's automatically cleaned up on disconnect
(`R6b`/Part 6/43).

## 12. Commentary projection (Phase 12)

```
      PostgreSQL (deliveries, match_events, innings, matches)
                        │
                  replayInnings() (unchanged, Section 3)
                        │
          domain/commentary/generateInningsCommentary()
             (pure — reads replay output, invents nothing)
                        │
                commentary_entries (PostgreSQL)
                        │
             ┌──────────┴──────────┐
             │                     │
   GET /matches/:id/commentary   match:commentary
      (commentary.service.js)   (cricketRealtime.js,
                                  same match:{id} room)
             └──────────┬──────────┘
                        │
              useMatchCommentary (client)
                        │
                 CommentaryPanel
```

### 12.1 Database decision: PostgreSQL, not MongoDB

Commentary rows are tied 1:1 (or a small fixed multiple, for milestones/lifecycle) to a specific
`deliveries`/`match_events` row, ordered by the SAME `log_sequence` axis, and regenerated
transactionally as a unit whenever a correction changes that ordering. That's a relational,
foreign-keyed, single-transaction-replace shape — exactly what PostgreSQL is for. Colocating it with
the cricket history it describes means:

- `ON DELETE CASCADE` (via `innings_id`/`source_delivery_id`/`source_event_id`) — deleting a
  fixture's test data, or an innings, cannot leave orphaned commentary anywhere, with no
  application-level cleanup code.
- A correction's "delete every row for this innings, regenerate, insert" (Section 12.6) is one
  ACID transaction in the SAME database the cricket write itself used — no cross-database
  eventual-consistency window to reason about.
- Query patterns are relational from the start: "commentary for innings X, newest-first, paginated"
  is a plain indexed `WHERE innings_id = $1 ORDER BY sequence DESC LIMIT $2`.

MongoDB was **not** chosen. "Commentary is fluctuating text" is not, by itself, a reason to reach for
a document store (see the Phase 12 brief's explicit warning against that reasoning) — the actual
shape of the data (strongly relational, correction-rewritable as a transactional unit, ordered by an
existing integer axis) points at PostgreSQL. MongoDB remains exactly what it was before Phase 12:
canteen-only, never a second source of cricket truth (Architectural Principle 4).

### 12.2 Commentary is a PROJECTION, never truth

`commentary_entries` cannot disagree with `deliveries`/`wickets`/`match_events` and remain
authoritative — if it ever does (a bug, a partial write), the fix is `rebuildInningsCommentary()`
regenerating it from the replay engine, never patching cricket truth to match a wrong sentence. The
domain layer (`server/src/domain/commentary/*`) imports only `domain/scoring/replay.js` and
`domain/scoring/eventTypes.js` — no `pg`, no Socket.IO, no Express, same purity discipline as
`replay.js` itself.

### 12.3 Structured entry shape (`commentary_entries` table)

`id, match_id, innings_id, entry_key, sequence, type, source_delivery_id, source_event_id,
over_number, ball_in_over, ball_label, text, tags (JSONB array), score_runs, score_wickets,
innings_version, created_at, updated_at`, unique on `(innings_id, entry_key)`.

`type` is one of `DELIVERY | WICKET | MILESTONE | OVER_END | INNINGS_END | INNINGS_BREAK |
MATCH_RESULT | MATCH_EVENT` (`domain/commentary/entryTypes.js`) — a small, closed taxonomy;
secondary classification (`FOUR`, `SIX`, `WICKET`, `BOWLED`, `FIFTY`, `DROPPED_CATCH`, ...) lives in
`tags`, not in a growing list of types.

`entry_key` is a deterministic, content-derived identity, never a surrogate: `d:{deliveryId}` (one
per delivery, DELIVERY or WICKET), `m:{deliveryId}:{50|100|wkts3|wkts5|partnership50|...}:{subjectId}`
(milestones), `oe:{overNumber}` / `oe:{overNumber}:maiden` (over end), `ie:{inningsId}` /
`ib:{inningsId}` (innings end/break), `mr:{matchId}` (match result), `is:{inningsId}` (second-innings
chase start), `e:{eventId}` (catch-dropped/retire/penalty-runs). Replaying the same log twice — a
retried request, or a rebuild after a correction — always maps to the same key, so persistence is
either an idempotent no-op insert (append path) or a full delete-and-replace (rebuild path); it never
accumulates duplicates.

`sequence` is assigned by `generateInningsCommentary`'s fold over the log (its position in the
generated output array), **never `created_at`** — so a correction that changes what happens after
the edited point re-derives a fully consistent order every time, not whatever order rows happened to
be written in.

### 12.4 Determinism (Part 14 — no `Math.random()`)

Where a case has more than one phrasing (`domain/commentary/templateSelect.js`), the template is
chosen by an FNV-1a hash of the delivery/event id — stable identity, never re-derived per call. The
SAME log always produces byte-identical commentary, refresh/restart/replay/correction after
correction (`generateInningsCommentary.test.js`'s determinism test asserts this directly).

### 12.5 Two call sites, one generator, zero drift

`generateInningsCommentary({ log, seed, format, innings, roster, shotsByDeliveryId, teamNames, match
})` is a pure function of the WHOLE log-to-date — it does not maintain incremental state between
calls. Two service functions call it identically:

- **`appendCommentaryForInnings(inningsId)`** (normal delivery/event path) — regenerates the full
  array (cheap at club scale, Section 12.8), but only PERSISTS the entries whose `sourceIndex` is the
  newest log entry, via `INSERT ... ON CONFLICT (innings_id, entry_key) DO NOTHING`. Returns only
  what was actually newly inserted.
- **`rebuildInningsCommentary(inningsId)`** (correction/undo/backfill path) — `DELETE FROM
  commentary_entries WHERE innings_id = $1` then bulk `INSERT`, inside one transaction. Used for
  corrections, `npm run commentary:rebuild` (pre-Phase-12 match backfill, idempotent — safe to run
  twice), and ad-hoc repair.

Because both call the SAME generator over the SAME log shape, there is no second implementation to
drift out of sync — the append path's output for entry *i* is byte-identical to what a full rebuild
would produce for that same entry.

### 12.6 Transaction boundary & failure isolation (Part 38/78/79)

Commentary generation/persistence is a SEPARATE step from the cricket write, called from the
CONTROLLER only after the scoring/correction service call has already returned (i.e. after that
service's own `COMMIT`) — same discipline as `publishMatchState` (Section 11.4). Wrapped in its own
try/catch: a commentary failure is logged and never rolls back an already-committed delivery, never
surfaces to the scorer's HTTP response, and never blocks the `match:state` broadcast beside it.
`rebuildInningsCommentary` only ever reads deliveries/match_events/innings/matches and only ever
writes `commentary_entries` — corrections/deliveries/wickets/innings truth are never touched by any
commentary code path.

### 12.7 Realtime: `match:commentary` (same room, new event)

Reuses the exact `match:{matchId}` room Phase 11 already established (`realtime/cricketRealtime.js`
now also exports `publishCommentary`) — no second room. Two modes:

| mode | when | payload |
|---|---|---|
| `append` | a normal delivery/event added new commentary | the newly-persisted entries |
| `resync` | a correction/undo may have changed many entries at once | `entries: []` — client refetches over HTTP (Part 40: safer than trying to prove only one line changed) |

Persist-then-publish: the broadcast only fires with entries that are already durably in
`commentary_entries`. Client (`useMatchCommentary.js`) treats a reconnect exactly like a `resync` —
refetches the first page rather than assuming any missed `append` will replay (Part 43).

### 12.8 Performance (measured, real dev server + real PostgreSQL)

- `GET /matches/:id/commentary` (30 entries, ~120 deliveries deep into the innings): **2-3ms**.
- Full-innings rebuild (120 deliveries + lifecycle entries, 148 rows regenerated): **146-174ms**.
- Commit → `match:commentary` socket frame (real WebSocket frame inspection): **18-85ms, avg
  ~46ms** across 5 runs.
- `match:commentary` payload size for one new entry: **283 bytes**.

The generator replays `log.slice(0, i)` for every index (Section 12.5) rather than folding
incrementally — an `O(n²)` cost in the number of prior log entries, deliberately: correctness first
(Part 30), and the measured numbers above show it's nowhere near a real bottleneck at club-cricket
innings lengths (~120-150 balls). Documented as a known limitation for a much longer format — see
`docs/TECHNICAL_DEBT.md`.

### 12.9 Backfill/repair

`npm run commentary:rebuild --prefix server` (`server/src/scripts/rebuildCommentary.js`) calls
`rebuildInningsCommentary` for every innings in the database — idempotent, read-only against cricket
truth, safe to run against matches that existed before Phase 12 (no commentary yet) or to repair a
suspected drift.

### 12.10 No AI

Commentary is 100% template-based, deterministic, offline. No LLM/AI API is called anywhere in this
phase. The structured facts each entry carries (`type`, `tags`, `score`, `deliveryId`/`eventId`,
`sequence`) are deliberately AI-enrichment-ready for a future phase, but nothing in Phase 12 depends
on or calls any AI service.

## 13. Player Match Availability / RSVP (Phase 14 Part 1)

`match_availability` (`match_id`, `player_id`, `status` — `PENDING`/`AVAILABLE`/`NOT_AVAILABLE`,
unique on `(match_id, player_id)`) is a real table, not a projection — a player's RSVP is genuine
input, not derived from anything else. Eligibility is computed from `players.team_id` matching one
of the match's two teams, not `match_players` — RSVP happens *before* the Playing XI exists
(`services/matchAvailability.service.js`). Authorization is structural: every write resolves the
caller's own player via `findPlayerByUserId(req.user.id)` — there is no `playerId` parameter
anywhere in the write path for a player to substitute another player's id into. Availability is
purely informational: nothing in this phase writes to `match_players`, and the roster UI only
*displays* a status badge next to each player — it never auto-selects or auto-excludes anyone.

## 14. Ground Booking (Phase 14 Part 3)

### 14.1 Database choice: PostgreSQL, not MongoDB

Bookings need relational references (users, and the `matches` table for occupancy checks),
overlapping-time-range queries, and a hard concurrency guarantee — PostgreSQL's native range types
and exclusion constraints are built for exactly this; MongoDB has no equivalent. No existing data
moved between databases — `ground_bookings` is a new, additive PostgreSQL table (Phase 13's own
precedent: new features default to Postgres unless they're genuinely document-shaped, like canteen).

### 14.2 The concurrency guarantee (the non-negotiable requirement)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE ground_bookings (
  ...
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
  ...
  CONSTRAINT ground_bookings_no_overlap EXCLUDE USING gist (
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status = 'CONFIRMED')
);
```

Two transactions concurrently inserting overlapping `[start_time, end_time)` ranges with
`status = 'CONFIRMED'` cannot both commit — PostgreSQL enforces this at the index level, the same
way a unique index enforces "no two rows with the same value," except over a *range* comparison
(`&&`, overlap) instead of equality. This is a genuine database-level guarantee, independent of any
application code, row lock, or pre-check — verified directly (not just unit-tested) by firing two
real concurrent `INSERT`s from two separate connections and confirming exactly one succeeds
(`server/src/tests/integration/groundBooking.integration.test.js`). The losing transaction receives
Postgres error `23P01`, translated by `groundBooking.service.js` into `BookingError` code
`BOOKING_CONFLICT` → HTTP `409`, with freshly-computed alternatives attached. `CANCELLED` rows are
excluded from the constraint via the `WHERE` clause, so a cancelled booking's slot becomes bookable
again immediately — no separate "release the slot" step exists because none is needed.

Staff-created blocks (`booking_type = 'STAFF_BLOCK'`) live in the *same* table and participate in
the *same* constraint, so a block and a customer booking mutually exclude each other for free — no
separate "is this time blocked OR booked" merge query anywhere.

LOC match occupancy is different in kind: `matches.match_date` is a single `TIMESTAMP` column with
no end time (confirmed by audit — no duration is derivable, even from `overs_per_innings`, which can
be `null`). Rather than fabricate a duration, a live/upcoming match blocks its **entire calendar
day** for booking purposes — a coarse, explicit, honestly-documented policy
(`groundBooking.repository.js#listMatchDatesInRange`), checked inside the same transaction as the
booking attempt, not layered on as an afterthought.

### 14.3 Timezone

No timezone library is added — `Asia/Kolkata` has a fixed, non-DST `+05:30` offset year-round, so
plain offset arithmetic (`domain/booking/timezone.js`) is exact, not an approximation. Every booking
timestamp is stored as a true UTC instant (`TIMESTAMPTZ`); "today," slot boundaries, and the
next/previous-day math for recommendations all go through this one module — nothing computes a date
boundary ad hoc, and nothing trusts the browser's or the server process's local timezone.

### 14.4 Slot policy

`domain/booking/policy.js` centralizes opening/closing hours and slot duration (env-overridable,
sensible defaults) — every booking is exactly one fixed-width slot in v1, no custom-duration picker.

### 14.5 Nearby-slot recommendations

`domain/booking/recommendations.js` is a pure function: given a requested slot and an
availability-lookup callback, it returns up to 5 alternatives in priority order (same-day nearest
earlier → same-day nearest later → next-day same time → other nearby days), each independently
verified AVAILABLE under the exact same rules as the original request — never a stale guess, and
never AI.

### 14.6 Google Calendar — sync only, never source of truth

`services/googleCalendar.service.js` authenticates as a **service account** against the ground's own
operational calendar (never a customer's personal OAuth). It follows the exact "optional dependency,
degrade gracefully" shape `config/db.js` already established for MongoDB: `isCalendarConfigured()`
gates every call, nothing it exports ever throws, and a booking's HTTP success/failure is 100%
decided before this module is ever touched — `groundBooking.service.js` calls it *after* the booking
row has already committed, and a sync failure only ever changes `google_sync_status` (`PENDING` →
`SYNCED`/`FAILED`/`NOT_CONFIGURED`), never the booking's own `status`. Idempotency is structural: the
booking's own `google_calendar_event_id` column is the only thing that decides whether a sync has
already happened, checked exactly once, at the one call site that ever creates an event — there is
no retry loop that could double-create one. A Google outage can never cause a double-booking,
because Google Calendar is never consulted for availability in the first place (Section 14.2's
constraint is the only source of truth).

### 14.7 Realtime

`realtime/bookingRealtime.js` mirrors `cricketRealtime.js`'s shape exactly (one additive
`io.on('connection', ...)` registration, one room-per-date, one fire-and-forget broadcast) — a
convenience refresh signal only. Exactly like cricket realtime, correctness never depends on it
being delivered: every client still performs its own authoritative check when it presses Confirm.
