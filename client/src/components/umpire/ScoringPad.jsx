const RUN_VALUES = [
  { runs: 0, label: '•', emphasis: false },
  { runs: 1, label: '1', emphasis: true },
  { runs: 2, label: '2', emphasis: true },
  { runs: 3, label: '3', emphasis: false },
  { runs: 4, label: '4', emphasis: true },
  { runs: 5, label: '5', emphasis: false },
  { runs: 6, label: '6', emphasis: true },
]

function runButtonClass(runs, emphasis) {
  if (runs === 4) return 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
  if (runs === 6) return 'bg-fuchsia-400/20 text-fuchsia-200 border border-fuchsia-400/40'
  return emphasis ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-400/30' : 'bg-white/5 text-emerald-100/70 border border-white/10'
}

export default function ScoringPad({ disabled, onRuns }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {RUN_VALUES.map(({ runs, label, emphasis }) => (
        <button
          key={runs}
          type="button"
          disabled={disabled}
          onClick={() => onRuns(runs)}
          className={`min-h-14 rounded-xl font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-16 ${
            emphasis ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
          } ${runButtonClass(runs, emphasis)}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
