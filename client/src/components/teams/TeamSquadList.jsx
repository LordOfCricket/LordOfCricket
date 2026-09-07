import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import { roleLabel, battingStyleLabel, bowlingStyleLabel } from '../../models/player.model.js'

// CURRENT squad membership, never the
// historical Playing XI of any one match. No captain/wicketkeeper badge here
// deliberately (an audited decision — those are match-specific facts
// in match_players, not permanent team metadata).
export default function TeamSquadList({ squad }) {
  const navigate = useNavigate()

  if (squad.length === 0) {
    return <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center text-sm text-slate-300">No players have joined this team yet.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {squad.map((player) => (
        <button
          key={player.publicPlayerId}
          type="button"
          onClick={() => navigate(`/players/${player.publicPlayerId}`)}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
        >
          <Avatar name={player.name} photoUrl={player.photoUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{player.name}</p>
            <p className="truncate text-xs text-emerald-300">{roleLabel(player.role) || 'Role not set'}</p>
            {(battingStyleLabel(player.battingStyle) || bowlingStyleLabel(player.bowlingStyle)) && (
              <p className="truncate text-[11px] text-slate-400">{[battingStyleLabel(player.battingStyle), bowlingStyleLabel(player.bowlingStyle)].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
