// Shared setup/teardown for scoring integration tests. Talks to whatever
// PostgreSQL database is configured in .env (PG_HOST etc.) — there is no
// separate test database for this project, so every fixture is created with
// an "Integration Test" name prefix and torn down explicitly at the end of
// each test via cleanup(). Deleting the fixture's `matches` row cascades away
// match_players/innings/deliveries/match_events/wickets/wagon_wheel_shots
// automatically (see schema.sql's ON DELETE CASCADE chain); teams/players are
// deleted explicitly afterward since nothing cascades to them.

import { pool } from '../../config/db.js'
import * as scoringService from '../../services/scoring.service.js'

export async function createFixture({ ballsPerOver = 6 } = {}) {
  const scorerUser = (
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('Integration Test Scorer', $1, 'not-a-real-hash', 'staff') RETURNING *`,
      [`integration-test-scorer-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`]
    )
  ).rows[0]

  const teamA = (await pool.query(`INSERT INTO teams (name, short_name) VALUES ('Integration Test A','ITA') RETURNING *`)).rows[0]
  const teamB = (await pool.query(`INSERT INTO teams (name, short_name) VALUES ('Integration Test B','ITB') RETURNING *`)).rows[0]

  const rahul = (await pool.query(`INSERT INTO players (team_id, name, role) VALUES ($1,'Rahul (test)','Batter') RETURNING *`, [teamA.id])).rows[0]
  const aman = (await pool.query(`INSERT INTO players (team_id, name, role) VALUES ($1,'Aman (test)','Batter') RETURNING *`, [teamA.id])).rows[0]
  const bowler1 = (await pool.query(`INSERT INTO players (team_id, name, role) VALUES ($1,'Bowler1 (test)','Bowler') RETURNING *`, [teamB.id])).rows[0]
  const bowler2 = (await pool.query(`INSERT INTO players (team_id, name, role) VALUES ($1,'Bowler2 (test)','Bowler') RETURNING *`, [teamB.id])).rows[0]

  const match = (
    await pool.query(
      `INSERT INTO matches (team_a_id, team_b_id, match_date, status, balls_per_over) VALUES ($1,$2,NOW(),'live',$3) RETURNING *`,
      [teamA.id, teamB.id, ballsPerOver]
    )
  ).rows[0]

  const mp = async (teamId, playerId) =>
    (await pool.query(`INSERT INTO match_players (match_id, team_id, player_id) VALUES ($1,$2,$3) RETURNING *`, [match.id, teamId, playerId])).rows[0]

  const mpRahul = await mp(teamA.id, rahul.id)
  const mpAman = await mp(teamA.id, aman.id)
  const mpBowler1 = await mp(teamB.id, bowler1.id)
  const mpBowler2 = await mp(teamB.id, bowler2.id)

  const innings = await scoringService.createInnings({ matchId: match.id, inningsNumber: 1, battingTeamId: teamA.id, bowlingTeamId: teamB.id })

  return {
    userId: scorerUser.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    matchId: match.id,
    inningsId: innings.id,
    rahul: mpRahul.id,
    aman: mpAman.id,
    bowler1: mpBowler1.id,
    bowler2: mpBowler2.id,
    playerIds: [rahul.id, aman.id, bowler1.id, bowler2.id],
    teamIds: [teamA.id, teamB.id],
    async seatOpeners() {
      await scoringService.recordEvent({ inningsId: innings.id, event: { eventType: 'batsman-in', payload: { end: 'strikerEnd', matchPlayerId: mpRahul.id } } })
      return scoringService.recordEvent({ inningsId: innings.id, event: { eventType: 'batsman-in', payload: { end: 'nonStrikerEnd', matchPlayerId: mpAman.id } } })
    },
    async cleanup() {
      // deliveries/wickets/wagon_wheel_shots/match_events reference match_players
      // WITHOUT cascade (intentional — scoring history must never silently vanish
      // because a roster entry was removed), so they have to go before
      // match_players, not just before `matches`. `matches` cascades to `innings`
      // which cascades to all of those, so deleting innings first covers it.
      await pool.query('DELETE FROM innings WHERE match_id = $1', [match.id])
      await pool.query('DELETE FROM match_players WHERE match_id = $1', [match.id])
      await pool.query('DELETE FROM matches WHERE id = $1', [match.id])
      await pool.query('DELETE FROM players WHERE id = ANY($1)', [[rahul.id, aman.id, bowler1.id, bowler2.id]])
      await pool.query('DELETE FROM teams WHERE id = ANY($1)', [[teamA.id, teamB.id]])
      // innings (deleted above) cascades away score_corrections, which is the
      // only thing that references this user, so it's safe to delete last.
      await pool.query('DELETE FROM users WHERE id = $1', [scorerUser.id])
    },
  }
}
