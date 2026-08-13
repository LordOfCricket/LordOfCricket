import { pool } from '../config/db.js'

// Umpire Communication & Commercial 2.0 — one row per umpire who actually
// COMPLETED a slot on a match that had a fee set at completion time.
// UNIQUE(match_umpire_slot_id) (schema.sql) makes "no duplicate earning for
// the same completed assignment" a DB guarantee — this INSERT ... ON
// CONFLICT DO NOTHING relies on exactly that.

// Idempotent — safe to call from every match-completion write path AND as a
// lazy defensive backstop on every read, mirroring the "recompute live,
// never trust one write path" convention Reputation 2.0 already
// established (buildReputationSummaries). No-ops entirely if the match
// never had a fee set (never a fabricated ₹0 earning).
export async function ensureEarningRecordsForMatch(matchId, client = pool) {
  const { rows: matchRows } = await client.query(`SELECT umpire_fee_amount, umpire_fee_currency FROM matches WHERE id = $1`, [matchId])
  const match = matchRows[0]
  if (!match || match.umpire_fee_amount == null) return []

  const { rows: completedSlots } = await client.query(
    `SELECT id, umpire_user_id FROM match_umpire_slots WHERE match_id = $1 AND status = 'COMPLETED' AND umpire_user_id IS NOT NULL`,
    [matchId],
  )
  if (!completedSlots.length) return []

  const { rows } = await client.query(
    `INSERT INTO umpire_earnings (match_id, match_umpire_slot_id, umpire_user_id, amount, currency)
     SELECT $1, slot_id, umpire_id, $2, $3
     FROM unnest($4::int[], $5::int[]) AS t(slot_id, umpire_id)
     ON CONFLICT (match_umpire_slot_id) DO NOTHING
     RETURNING *`,
    [matchId, match.umpire_fee_amount, match.umpire_fee_currency, completedSlots.map((s) => s.id), completedSlots.map((s) => s.umpire_user_id)],
  )
  return rows
}

export async function findEarningsForMatch(matchId) {
  const { rows } = await pool.query(`SELECT * FROM umpire_earnings WHERE match_id = $1`, [matchId])
  return rows
}

export async function findEarningBySlotId(slotId) {
  const { rows } = await pool.query(`SELECT * FROM umpire_earnings WHERE match_umpire_slot_id = $1`, [slotId])
  return rows[0] || null
}

export async function updatePaymentStatus(earningId, status) {
  const { rows } = await pool.query(`UPDATE umpire_earnings SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`, [earningId, status])
  return rows[0] || null
}

// Umpire's own earnings — a small, cohesive summary (This Month / Pending /
// Paid totals) plus a bounded recent list, one round trip each, never N+1.
export async function findEarningsSummaryForUmpire(umpireUserId) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS this_month,
       COALESCE(SUM(amount) FILTER (WHERE status IN ('PENDING', 'APPROVED')), 0) AS pending,
       COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS paid,
       COUNT(*)::int AS total_count
     FROM umpire_earnings
     WHERE umpire_user_id = $1`,
    [umpireUserId],
  )
  return rows[0]
}

export async function findRecentEarningsForUmpire(umpireUserId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT e.id, e.amount, e.currency, e.status, e.created_at, e.updated_at,
            m.id AS match_id, m.match_date, m.venue,
            g.name AS ground_name,
            ta.name AS team_a_name, tb.name AS team_b_name
     FROM umpire_earnings e
     JOIN matches m ON m.id = e.match_id
     LEFT JOIN grounds g ON g.id = m.ground_id
     JOIN teams ta ON ta.id = m.team_a_id
     JOIN teams tb ON tb.id = m.team_b_id
     WHERE e.umpire_user_id = $1
     ORDER BY e.created_at DESC
     LIMIT $2`,
    [umpireUserId, limit],
  )
  return rows
}
