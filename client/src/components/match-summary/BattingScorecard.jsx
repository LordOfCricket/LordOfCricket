import { useNavigate } from 'react-router-dom'

function statusText(row) {
  if (row.status === 'DNB') return 'Did Not Bat'
  if (row.status === 'YTB') return 'Yet to Bat'
  return row.dismissalText
}

export default function BattingScorecard({ innings }) {
  const navigate = useNavigate()
  const active = innings.batting.filter((r) => r.status === 'NOT_OUT' || r.status === 'OUT')
  const dnb = innings.batting.filter((r) => r.status === 'DNB')
  const ytb = innings.batting.filter((r) => r.status === 'YTB')

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Batting</p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="pb-2">Batter</th>
              <th className="pb-2 text-right">R</th>
              <th className="pb-2 text-right">B</th>
              <th className="pb-2 text-right">4s</th>
              <th className="pb-2 text-right">6s</th>
              <th className="pb-2 text-right">SR</th>
            </tr>
          </thead>
          <tbody>
            {active.map((row) => (
              <tr key={row.player.publicPlayerId} className="border-t border-white/5">
                <td className="py-2 pr-2">
                  <button
                    type="button"
                    onClick={() => row.player.publicPlayerId && navigate(`/players/${row.player.publicPlayerId}`)}
                    className="text-left font-semibold text-white hover:text-emerald-300"
                  >
                    {row.player.name}
                  </button>
                  <p className="text-xs text-slate-400">{statusText(row)}</p>
                </td>
                <td className="py-2 text-right font-bold text-white">{row.runs}</td>
                <td className="py-2 text-right text-slate-300">{row.balls}</td>
                <td className="py-2 text-right text-slate-300">{row.fours}</td>
                <td className="py-2 text-right text-slate-300">{row.sixes}</td>
                <td className="py-2 text-right text-slate-300">{row.strikeRate?.toFixed(2) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
        <span className="text-slate-300">
          Extras {innings.extras.total}
          <span className="text-xs text-slate-500">
            {' '}
            (w {innings.extras.wides}, nb {innings.extras.noBalls}, b {innings.extras.byes}, lb {innings.extras.legByes})
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm font-bold text-white">
        <span>Total</span>
        <span>
          {innings.total.runs}/{innings.total.wickets} ({innings.total.oversLabel} ov, RR {innings.total.runRate.toFixed(2)})
        </span>
      </div>

      {ytb.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yet to Bat</p>
          <p className="mt-1 text-sm text-slate-300">{ytb.map((r) => r.player.name).join(', ')}</p>
        </div>
      )}
      {dnb.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Did Not Bat</p>
          <p className="mt-1 text-sm text-slate-300">{dnb.map((r) => r.player.name).join(', ')}</p>
        </div>
      )}
    </div>
  )
}
