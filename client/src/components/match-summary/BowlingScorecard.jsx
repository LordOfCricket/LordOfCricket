import { useNavigate } from 'react-router-dom'

export default function BowlingScorecard({ innings }) {
  const navigate = useNavigate()
  if (innings.bowling.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bowling</p>
        <p className="mt-3 text-sm text-slate-400">Nobody has bowled yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bowling</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-2">Bowler</th>
              <th className="pb-2 text-right">O</th>
              <th className="pb-2 text-right">M</th>
              <th className="pb-2 text-right">R</th>
              <th className="pb-2 text-right">W</th>
              <th className="pb-2 text-right">Econ</th>
            </tr>
          </thead>
          <tbody>
            {innings.bowling.map((row) => (
              <tr key={row.player.publicPlayerId} className="border-t border-white/5">
                <td className="py-2 pr-2">
                  <button
                    type="button"
                    onClick={() => row.player.publicPlayerId && navigate(`/players/${row.player.publicPlayerId}`)}
                    className="text-left font-semibold text-white hover:text-emerald-300"
                  >
                    {row.player.name}
                  </button>
                  {(row.wides > 0 || row.noBalls > 0) && (
                    <p className="text-xs text-slate-400">
                      wd {row.wides}, nb {row.noBalls}
                    </p>
                  )}
                </td>
                <td className="py-2 text-right text-slate-300">{row.oversLabel}</td>
                <td className="py-2 text-right text-slate-300">{row.maidens}</td>
                <td className="py-2 text-right text-slate-300">{row.runs}</td>
                <td className="py-2 text-right font-bold text-white">{row.wickets}</td>
                <td className="py-2 text-right text-slate-300">{row.economy?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
