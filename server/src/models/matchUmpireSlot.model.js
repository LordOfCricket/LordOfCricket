import { pool } from '../config/db.js'

// One row per slot (U1's approved Decision 3) — created once, at match
// creation, from matches.required_umpires. `client` defaults to pool but
// accepts a transaction client so match.service.js's createMatch can create
// the match row and its slots atomically.
export async function createSlotsForMatch(matchId, count, client = pool) {
  if (!count) return []
  const values = []
  const params = [matchId]
  for (let slotNumber = 1; slotNumber <= count; slotNumber++) {
    params.push(slotNumber)
    values.push(`($1, $${params.length})`)
  }
  const { rows } = await client.query(`INSERT INTO match_umpire_slots (match_id, slot_number) VALUES ${values.join(', ')} RETURNING *`, params)
  return rows
}

export async function findSlotsByMatch(matchId) {
  const { rows } = await pool.query(
    `SELECT s.*, u.name AS umpire_name
     FROM match_umpire_slots s
     LEFT JOIN users u ON u.id = s.umpire_user_id
     WHERE s.match_id = $1
     ORDER BY s.slot_number`,
    [matchId],
  )
  return rows
}

export async function hasActiveSlotAssignment(matchId, userId, client = pool) {
  const { rows } = await client.query(`SELECT 1 FROM match_umpire_slots WHERE match_id = $1 AND umpire_user_id = $2 AND status = 'ASSIGNED' LIMIT 1`, [
    matchId,
    userId,
  ])
  return rows.length > 0
}

// Overlap-prevention read — every OTHER match this umpire currently holds an
// ASSIGNED slot on (CANCELLED/NO_SHOW/COMPLETED are never "active" here,
// matching hasActiveSlotAssignment's own exact definition of "active" —
// same notion reused, not redefined). `client` accepts the same-transaction
// connection applyForSlot's advisory lock runs in, so this read is
// serialized against any concurrent apply by the same umpire.
export async function findActiveAssignedMatchesForUmpire(userId, excludeMatchId = null, client = pool) {
  const { rows } = await client.query(
    `SELECT m.id, m.match_date, m.overs_per_innings, m.balls_per_over
     FROM match_umpire_slots s
     JOIN matches m ON m.id = s.match_id
     WHERE s.umpire_user_id = $1 AND s.status = 'ASSIGNED' AND ($2::int IS NULL OR m.id != $2)`,
    [userId, excludeMatchId],
  )
  return rows
}

// The atomic claim (U1 Decision 3 / Phase 0's slot-row design): the subquery
// locks and picks ONE eligible row (FOR UPDATE SKIP LOCKED — a concurrent
// claimer skips a row already locked by another in-flight claim rather than
// waiting for and then re-checking it), and the UPDATE only ever touches
// that single locked row. With exactly `required_umpires` rows ever existing
// for a match, over-allocation is structurally impossible — there is no
// count to race on. Eligible rows are AVAILABLE (never claimed) or
// CANCELLED (claimed once, then released) — both are open capacity.
export async function claimAvailableSlot(matchId, userId, client = pool) {
  const { rows } = await client.query(
    `UPDATE match_umpire_slots
     SET status = 'ASSIGNED', umpire_user_id = $2, assigned_at = NOW(), cancelled_at = NULL, cancellation_reason = NULL
     WHERE id = (
       SELECT id FROM match_umpire_slots
       WHERE match_id = $1 AND status IN ('AVAILABLE', 'CANCELLED')
       ORDER BY slot_number
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [matchId, userId],
  )
  return rows[0] || null
}

// Scoped to (matchId, userId) in the WHERE clause itself — never a slot id
// or slot number supplied by the caller — so this can only ever cancel the
// CALLING user's own assignment. There is at most one ASSIGNED row per
// (match, umpire) by construction (the partial unique index from U1), so no
// slot identifier is needed to disambiguate which one.
export async function cancelMyAssignment(matchId, userId, reason = null) {
  const { rows } = await pool.query(
    `UPDATE match_umpire_slots
     SET status = 'CANCELLED', cancelled_at = NOW(), cancellation_reason = $3
     WHERE match_id = $1 AND umpire_user_id = $2 AND status = 'ASSIGNED'
     RETURNING *`,
    [matchId, userId, reason],
  )
  return rows[0] || null
}

// U4 read #1 — umpire discovery: real 'upcoming' matches that still have
// open capacity (AVAILABLE or CANCELLED = reclaimable — same eligibility
// claimAvailableSlot uses). A match with required_umpires=0 has no slot rows
// at all, so EXISTS(...) is false and it never appears here — no invented
// slots, no match ever shown as "needs an umpire" that wasn't actually set
// up to have one.
export async function findAvailableMatchesForUmpire() {
  const { rows } = await pool.query(
    `SELECT
       m.id, m.match_date, m.venue, m.status, m.required_umpires,
       ta.name AS team_a_name, ta.short_name AS team_a_short,
       tb.name AS team_b_name, tb.short_name AS team_b_short,
       g.name AS ground_name, g.city AS ground_city,
       (SELECT COUNT(*)::int FROM match_umpire_slots s WHERE s.match_id = m.id) AS total_slots,
       (SELECT COUNT(*)::int FROM match_umpire_slots s WHERE s.match_id = m.id AND s.status = 'ASSIGNED') AS filled_slots
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     LEFT JOIN grounds g ON g.id = m.ground_id
     WHERE m.status = 'upcoming'
       AND EXISTS (SELECT 1 FROM match_umpire_slots s WHERE s.match_id = m.id AND s.status IN ('AVAILABLE', 'CANCELLED'))
     ORDER BY m.match_date ASC`,
  )
  return rows
}

// Umpire ground-wise discovery read — one batched query across every
// candidate ground (WHERE ground_id = ANY($1)), not a loop per ground, so
// this stays two DB round-trips total for the whole discovery endpoint
// regardless of how many grounds are nearby. Deliberately NOT filtered by
// slot availability or required_umpires>0 (unlike findAvailableMatchesForUmpire
// above) — a fully-staffed match and a required_umpires=0 match must still
// appear here so the ground itself still renders with those rows; the
// frontend derives each row's state/button from the real numbers instead
// of a row being silently dropped. current_user_assigned lets the frontend
// show "you're assigned" instead of an apply button, without a separate
// lookup.
export async function findUpcomingMatchesForGrounds(groundIds, userId) {
  if (!groundIds.length) return []
  const { rows } = await pool.query(
    `SELECT
       m.id, m.ground_id, m.match_date, m.venue, m.required_umpires,
       ta.name AS team_a_name, ta.short_name AS team_a_short,
       tb.name AS team_b_name, tb.short_name AS team_b_short,
       (SELECT COUNT(*)::int FROM match_umpire_slots s WHERE s.match_id = m.id) AS total_slots,
       (SELECT COUNT(*)::int FROM match_umpire_slots s WHERE s.match_id = m.id AND s.status = 'ASSIGNED') AS filled_slots,
       EXISTS (SELECT 1 FROM match_umpire_slots s WHERE s.match_id = m.id AND s.umpire_user_id = $2 AND s.status = 'ASSIGNED') AS current_user_assigned
     FROM matches m
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.ground_id = ANY($1::int[]) AND m.status = 'upcoming'
     ORDER BY m.match_date ASC`,
    [groundIds, userId],
  )
  return rows
}

// U4 read #2 — "My Assignments": every slot this user has ever held, newest
// match first, with enough match/team/ground context to render a card
// without a second round trip. The frontend buckets by (match.status,
// slot.status) into upcoming/live/completed sections — no separate
// "history" query, this IS the history (Do NOT build advanced history
// analytics yet — plain chronological list is enough for U4).
export async function findSlotsForUmpire(userId) {
  const { rows } = await pool.query(
    `SELECT
       s.id, s.slot_number, s.status, s.assigned_at, s.cancelled_at,
       m.id AS match_id, m.match_date, m.venue, m.status AS match_status,
       ta.name AS team_a_name, ta.short_name AS team_a_short,
       tb.name AS team_b_name, tb.short_name AS team_b_short,
       g.name AS ground_name, g.city AS ground_city
     FROM match_umpire_slots s
     JOIN matches m ON m.id = s.match_id
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     LEFT JOIN grounds g ON g.id = m.ground_id
     WHERE s.umpire_user_id = $1
     ORDER BY m.match_date DESC`,
    [userId],
  )
  return rows
}

// Live stats, computed directly from match_umpire_slots/matches rather than
// umpire_profiles' cached counters (which nothing increments yet — showing
// them would mean "Matches Officiated" stays 0 forever even after a real
// match is officiated, which is worse than not caching). "Officiated" means
// held an ASSIGNED/COMPLETED slot on a match that reached a real result.
export async function getUmpireStats(userId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE m.status IN ('completed', 'finalized') AND s.status IN ('ASSIGNED', 'COMPLETED'))::int AS matches_officiated,
       COUNT(*) FILTER (WHERE s.status = 'CANCELLED')::int AS matches_cancelled,
       COUNT(*) FILTER (WHERE m.status IN ('upcoming', 'live') AND s.status = 'ASSIGNED')::int AS upcoming_assignments
     FROM match_umpire_slots s
     JOIN matches m ON m.id = s.match_id
     WHERE s.umpire_user_id = $1`,
    [userId],
  )
  return rows[0]
}
