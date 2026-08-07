import { useNavigate } from 'react-router-dom'

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function PlayingXiList({ title, entries }) {
  const navigate = useNavigate()
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {entries.map((e) => (
          <li key={e.player.publicPlayerId}>
            <button
              type="button"
              onClick={() => e.player.publicPlayerId && navigate(`/players/${e.player.publicPlayerId}`)}
              className="text-sm text-slate-200 hover:text-emerald-300"
            >
              {e.player.name}
              {e.isCaptain && <span className="ml-1 text-xs font-bold text-amber-300">(C)</span>}
              {e.isWicketkeeper && <span className="ml-1 text-xs font-bold text-sky-300">(WK)</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MatchInfoPanel({ summary }) {
  const { match, teams, toss, result, playingXi } = summary

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Match Info</p>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between sm:block">
            <dt className="text-slate-500">Date</dt>
            <dd className="text-slate-200">{formatDateTime(match.matchDate)}</dd>
          </div>
          {match.venue && (
            <div className="flex justify-between sm:block">
              <dt className="text-slate-500">Venue</dt>
              <dd className="text-slate-200">{match.venue}</dd>
            </div>
          )}
          <div className="flex justify-between sm:block">
            <dt className="text-slate-500">Overs</dt>
            <dd className="text-slate-200">{match.oversPerInnings ?? 'Unlimited'}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-slate-500">Balls per Over</dt>
            <dd className="text-slate-200">{match.ballsPerOver}</dd>
          </div>
          {toss && (
            <div className="flex justify-between sm:col-span-2 sm:block">
              <dt className="text-slate-500">Toss</dt>
              <dd className="text-slate-200">{toss.text}</dd>
            </div>
          )}
          {result && (
            <div className="flex justify-between sm:col-span-2 sm:block">
              <dt className="text-slate-500">Result</dt>
              <dd className="text-slate-200">{result.text}</dd>
            </div>
          )}
        </dl>
      </div>

      {(playingXi.teamA.length > 0 || playingXi.teamB.length > 0) && (
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Playing XI</p>
          <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <PlayingXiList title={teams.teamA.name} entries={playingXi.teamA} />
            <PlayingXiList title={teams.teamB.name} entries={playingXi.teamB} />
          </div>
        </div>
      )}
    </div>
  )
}
