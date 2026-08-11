import { useEffect, useState } from 'react'
import { fetchTeam } from '../services/playerApi.js'
import { useAuth } from './useAuth.js'

export function usePlayerDashboard() {
  const { user, player, refreshPlayer } = useAuth()
  const [team, setTeam] = useState(null)

  useEffect(() => {
    if (!player) refreshPlayer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!player?.team_id) return undefined
    let cancelled = false
    fetchTeam(player.team_id)
      .then((fetchedTeam) => {
        if (!cancelled) setTeam(fetchedTeam)
      })
      .catch(() => {
        if (!cancelled) setTeam(null)
      })
    return () => {
      cancelled = true
    }
  }, [player?.team_id])

  const isNewPlayer = !player?.role && !player?.team_id

  return {
    user,
    player,
    team: player?.team_id ? team : null,
    isNewPlayer,
  }
}
