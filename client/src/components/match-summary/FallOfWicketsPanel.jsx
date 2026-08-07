export default function FallOfWicketsPanel({ innings }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fall of Wickets</p>
      {innings.fallOfWickets.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No wickets fell.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {innings.fallOfWickets.map((fow) => (
            <span key={fow.wicketNumber} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-300">
              <span className="font-bold text-white">{fow.wicketNumber}-{fow.score}</span> ({fow.player.name}, {fow.overBall})
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
