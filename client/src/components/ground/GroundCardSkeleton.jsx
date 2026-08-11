// Phase 13 Step 14 — loading state for the discovery grid. Same shape as
// GroundCard so the layout doesn't jump when real cards replace these.
export default function GroundCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-emerald-400/10 bg-linear-to-b from-white/6 to-transparent shadow-lg shadow-black/20">
      <div className="h-44 w-full bg-white/5" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-5 w-3/4 rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  )
}
