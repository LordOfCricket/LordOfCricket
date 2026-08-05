# LOC API Overview

Base path: `/api`. All request/response bodies are JSON. Authenticated routes expect
`Authorization: Bearer <jwt>`.

Legend: **Public** = no auth required · **Auth** = any logged-in user · **Staff** = `role='staff'`
· **Scorer** = staff OR an approved umpire (`role='player'` and `player_type='umpire'`) ·
**Owner** = the authenticated user acting on their own resource (staff may act on behalf of others
where noted).

## Auth (`/api/auth`)

| Method & Path | Access | Notes |
|---|---|---|
| `POST /signup` | Public | Creates a user account, returns `{ token, user }` |
| `POST /login` | Public | Returns `{ token, user }` |
| `GET /me` | Auth | Current user |
| `PATCH /role` | Auth | `role` = `'player'` \| `'staff'` |
| `PATCH /player-type` | Auth | `playerType` = `'team_player'` \| `'umpire'`; selecting `'umpire'` files an umpire request |

## Self-service profile (`/api/me`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /player` | Auth | The caller's own player profile (`{ player: null }` if none linked — not a 404) |
| `PATCH /player` | Auth | Creates the profile on first save if none exists |
| `GET /stats` | Auth | Official career stats for the caller's own linked player — **404** if no player is linked (an accurate "resource doesn't exist" for staff/umpire-only accounts, not a bug) |

## Umpire requests (`/api/umpire-requests`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /me` | Auth | The caller's own latest request |
| `GET /` | Staff | All pending requests |
| `PATCH /:id` | Staff | Approve/reject |

## Teams (`/api/teams`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /discover` | Public | Search + paginated team list (card DTO) |
| `GET /` | Public | Unbounded lightweight team list (used by filter dropdowns) |
| `GET /:id/profile` | Public | Full public team profile — squad, official record, recent form, recent/upcoming/live matches, top performers |
| `GET /:id` | Auth | Raw team row (staff/roster-management use) |
| `GET /:id/players` | Auth | Current roster |
| `POST /:id/players` | Staff | Phase 13 — add a player (`{ publicPlayerId }`) to this team's roster. `players.team_id` is a single FK, so a player already on another team is moved, not duplicated; `409` if already on this team |
| `DELETE /:id/players/:publicPlayerId` | Staff | Phase 13 — remove a player from this team's roster (clears `team_id`); `404` if the player isn't currently on this team |

## Players (`/api/players`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /` | Public | Search/discovery, paginated |
| `GET /:publicPlayerId` | Public | Public profile |
| `GET /:publicPlayerId/stats` | Public | Official career stats (finalized matches only) |

## Leaderboards (`/api/stats`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /leaderboards/:metric` | Public | `role`/`teamId` filters, paginated; qualification rules centralized in `domain/statistics/leaderboardConfig.js` |

## Matches (`/api/matches`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /discover` | Public | `category` (`LIVE`\|`UPCOMING`\|`RESULTS`, required) + `limit`/`offset` |
| `GET /home` | Public | Homepage feed: featured live + bounded upcoming/results |
| `GET /` | Public | Unbounded match list (staff match-creation flows) |
| `POST /` | Scorer | Create a match |
| `GET /:id` | Public | Raw match + team names |
| `GET /:id/summary` | Public | Full public Match Summary DTO |
| `GET /:id/live-state` | Public | Lightweight spectator live-state DTO, meant to be polled |
| `GET /:id/commentary` | Public | Deterministic commentary feed (Phase 12) — `inningsId` (default: latest), `before`/`limit` (pagination cursor, newest-first), `type` (one `COMMENTARY_TYPES` value) query params |
| `PATCH /:id/toss` | Scorer | |
| `POST /:id/start` | Scorer | Requires toss + minimum Playing XI on both sides |
| `POST /:id/finalize` | Scorer | One-way lock; only reachable from `completed` |

## Match setup & scoring (`/api/matches/:matchId/...`, `/api/innings/:inningsId/...`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /matches/:matchId/match-players` | Public | Roster for this match |
| `POST /matches/:matchId/match-players` | Scorer | Add a player to the Playing XI |
| `GET /matches/:matchId/innings` | Public | |
| `POST /matches/:matchId/innings` | Scorer | Innings 2+ must reverse innings N-1's batting/bowling teams |
| `GET /innings/:inningsId/state` | Public | Full replayed state |
| `GET /innings/:inningsId/timeline` | Public | |
| `GET /innings/:inningsId/wagon-wheel` | Public | |
| `POST /innings/:inningsId/deliveries` | Scorer | `expectedVersion` + `clientActionId` required for concurrency/idempotency |
| `POST /innings/:inningsId/events` | Scorer | `batsman-in`, `bowler-change`, `retire`, `penalty-runs`, etc. |

## Match availability / RSVP (`/api/matches/:matchId/availability`, `/api/me/availability/:matchId`) — Phase 14 Part 1

| Method & Path | Access | Notes |
|---|---|---|
| `GET /me/availability/:matchId` | Auth | The caller's own RSVP; `{eligible: false, status: null}` if not on either team |
| `PATCH /me/availability/:matchId` | Auth | Body `{status: 'AVAILABLE'\|'NOT_AVAILABLE'}`; own player only, never an arbitrary `playerId`; `409` once the match is no longer `upcoming` |
| `GET /matches/:matchId/availability` | Scorer | Every eligible player (both teams), `PENDING` default — organizer read view, informational only |

## Corrections (`/api/innings/:inningsId/corrections`)

| Method & Path | Access | Notes |
|---|---|---|
| `POST /preview` | Scorer | No write — reports exactly which downstream deliveries/dismissals would change |
| `POST /` | Scorer | Applies the correction inside a transaction, bumps `innings.version` |
| `GET /` | Scorer | Correction history |
| `POST /:correctionId/undo` | Scorer | Creates a new, reversing correction row — never mutates the original |

## Realtime (Socket.IO, same origin as the API — `VITE_SOCKET_URL`)

One shared Socket.IO server. Public, unauthenticated — matches the public-read posture of the
Match Summary/live-state HTTP endpoints (Part 4 of the Phase 11 spec: subscribing to a match's
live state is not a privileged action). Scoring/correction writes always go through the
authenticated HTTP endpoints above — there is no socket-based write path (Part 45).

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `join-match` | client → server | `{ matchId }` | Server validates the match exists before joining the `match:{matchId}` room; the client never controls the raw room string |
| `leave-match` | client → server | `{ matchId }` | |
| `match:state` | server → room | the same live-state DTO `GET /matches/:id/live-state` returns, plus `{ matchId, reason }` | `reason` is informational only (`delivery`\|`event`\|`correction`\|`correction_undo`\|`lifecycle`\|`match_completed`) — never branch client logic on it |
| `match:commentary` | server → room | `{ matchId, inningsId, inningsVersion, mode, entries }` (Phase 12) | `mode` is `append` (entries = newly-persisted commentary rows) or `resync` (entries = `[]` — client refetches `GET /:id/commentary`) |
| `match:error` | server → client | `{ message }` | Invalid/missing matchId, or match not found |
| `join-booking-date` / `leave-booking-date` | client → server | `{ dateStr }` | Phase 14 — joins room `booking:{dateStr}` |
| `booking:updated` | server → room | `{ dateStr }` | A refresh signal only (no payload data) — clients re-fetch `GET /bookings/availability`. Correctness never depends on this delivering (Part 42) |

Canteen realtime events (`join-staff-room`, `join-order-room`, `join-user-room`,
`menu.updated`/`menu-updated`, `order-created`, `order-status-updated`, `order-completed`) are
unrelated and unchanged — see `docs/ARCHITECTURE.md` §10.

## Canteen (`/api/canteen/menu`, `/api/canteen/orders`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /menu` | Public | Today's live menu |
| `GET /menu/master` | Public | Full master item catalogue |
| `GET /menu/today/config` | Public | |
| `PATCH /menu/today` | Staff | Updates today's active menu |
| `POST/PATCH/DELETE /menu/master...` | Staff | Menu item CRUD, image upload |
| `POST /orders` | Auth | Places an order for the caller |
| `GET /orders/active/:userId` | Auth (owner or staff) | |
| `GET /orders/history/:userId` | Auth (owner or staff) | |
| `GET /orders`, `GET /orders/lookup`, `GET /orders/:id`, `PATCH /orders/:id/status` | Staff | |

## Ground Booking (`/api/bookings`) — Phase 14 Part 3

PostgreSQL is authoritative (see docs/ARCHITECTURE.md's Phase 14 section); Google Calendar is
sync-only, never queried for availability.

| Method & Path | Access | Notes |
|---|---|---|
| `GET /availability?date=YYYY-MM-DD` | Public | Slot grid for one ground-local date; `reason` is `null` unless the caller is staff (Part 47 — public view only ever sees AVAILABLE/UNAVAILABLE) |
| `POST /` | Auth | Body: `{startTime}` (an ISO instant from `GET /availability`, preferred) or `{date, hour, minute}`, plus `purpose`/`expectedPlayers`/`contactPhone`/`clientActionId` (optional). `409 BOOKING_CONFLICT` with `{details: {alternatives}}` on a lost race |
| `GET /my` | Auth | The caller's own bookings |
| `POST /:publicBookingId/cancel` | Auth (owner or staff) | Releases the slot immediately (the DB exclusion constraint excludes `CANCELLED` rows) |
| `GET /staff/schedule?from=&to=` | Staff | Every booking + staff block in range |
| `POST /staff/block` | Staff | Same body shape as `POST /`, `bookingType` forced to `STAFF_BLOCK` |
| `DELETE /staff/block/:publicBookingId` | Staff | `404` if that reference isn't actually a staff block |

## Ground/marketing content (`/api/ground-photos`, `/api/amenities`, `/api/advertisements`, `/api/partners`)

| Method & Path | Access |
|---|---|
| `GET /` | Public |
| `POST /`, `POST /upload`, `DELETE /:id` | Staff |

## External widget (`/api/india-match`)

| Method & Path | Access | Notes |
|---|---|---|
| `GET /featured` | Public | Proxies CricAPI for an unofficial "India match" homepage widget. Returns `null` (never a 500) if unconfigured/unavailable — this is NOT LOC's own cricket data. |

## Health

| Method & Path | Access |
|---|---|
| `GET /health` | Public |
| `GET /canteen/health` | Public |

---

**Response conventions** (current state, not fully uniform — see docs/TECHNICAL_DEBT.md if
standardizing this becomes a priority): most endpoints return either the resource directly wrapped
in a named key (`{ match }`, `{ team }`, `{ players }`) or, for the newer public read-model
endpoints (match discovery, match summary, live state, team profile), the DTO directly at the top
level. Errors are `{ message }` or, for scoring/correction domain errors, the structured
`{ code, message, details }` shape from `domain/scoring/errors.js`.
