import { pool } from '../config/db.js'

export async function findFeedbackByMatchAndUser(matchId, userId) {
  const { rows } = await pool.query(`SELECT * FROM match_feedback WHERE match_id = $1 AND submitted_by = $2`, [matchId, userId])
  return rows[0] || null
}

// Eligibility's "did this user actually play in this match" check (U1's own
// stated design intent for this table) — any match_players row is enough,
// not just playing-XI, same convention U3's feedback-eligibility note
// already established for this exact relationship.
export async function isMatchParticipant(matchId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM match_players mp JOIN players p ON p.id = mp.player_id WHERE mp.match_id = $1 AND p.user_id = $2 LIMIT 1`,
    [matchId, userId],
  )
  return rows.length > 0
}

// `client` is the transaction client — this only ever runs inside
// submitFeedback's transaction, never standalone, so no client=pool default.
export async function insertMatchFeedback(
  client,
  { matchId, userId, groundRating, groundCommentLiked, groundCommentImprove, appRating, appCommentLiked, appCommentImprove, appFeatureLiked },
) {
  const { rows } = await client.query(
    `INSERT INTO match_feedback
       (match_id, submitted_by, ground_rating, ground_comment_liked, ground_comment_improve,
        app_rating, app_comment_liked, app_comment_improve, app_feature_liked)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [matchId, userId, groundRating, groundCommentLiked, groundCommentImprove, appRating, appCommentLiked, appCommentImprove, appFeatureLiked],
  )
  return rows[0]
}

export async function insertUmpireRating(client, { matchFeedbackId, umpireUserId, rating, commentLiked, commentImprove }) {
  const { rows } = await client.query(
    `INSERT INTO match_feedback_umpire_ratings (match_feedback_id, umpire_user_id, rating, comment_liked, comment_improve)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [matchFeedbackId, umpireUserId, rating, commentLiked, commentImprove],
  )
  return rows[0]
}
