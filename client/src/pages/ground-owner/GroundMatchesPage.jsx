import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import BackButton from '../../components/common/BackButton.jsx'
import { useMyGrounds } from '../../hooks/useMyGrounds.js'
import { useGroundMatches } from '../../hooks/useGroundMatches.js'
import { useMatchUmpireSlots } from '../../hooks/useMatchUmpireSlots.js'
import { fetchTeams } from '../../services/playerApi.js'
import { formatMatchDate, formatMatchTime, statusLabel, formatMatchResultLine } from '../../models/matchDiscovery.model.js'
import { slotStatusInfo, describeSlot } from '../../models/groundOwnerDashboard.model.js'
import GroundOwnerLayout from '../../components/ground-owner/GroundOwnerLayout.jsx'
import { StatsErrorState } from '../../components/stats/StatsStates.jsx'

function CreateMatchForm({ onCreate, creating, createError, onDone }) {
  const [teams, setTeams] = useState([])
  const [teamAId, setTeamAId] = useState('')
  const [teamBId, setTeamBId] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [requiredUmpires, setRequiredUmpires] = useState(2)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchTeams().then(setTeams).catch(() => setTeams([]))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!teamAId || !teamBId) return setFormError('Select both teams.')
    if (teamAId === teamBId) return setFormError('Team A and Team B must be different.')
    if (!matchDate) return setFormError('Match date is required.')

    const ok = await onCreate({
      teamAId: Number(teamAId),
      teamBId: Number(teamBId),
      matchDate,
      requiredUmpires: Number(requiredUmpires),
    })
    if (ok) onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
      {(formError || createError) && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-rose-300">{formError || createError}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">Team A</span>
          <select
            value={teamAId}
            onChange={(e) => setTeamAId(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white"
          >
            <option value="" className="bg-slate-900">— Select —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">Team B</span>
          <select
            value={teamBId}
            onChange={(e) => setTeamBId(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white"
          >
            <option value="" className="bg-slate-900">— Select —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-200">Date &amp; Time</span>
        <input
          type="datetime-local"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          required
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-200">Required Umpires</span>
        <input
          type="number"
          min={0}
          max={4}
          value={requiredUmpires}
          onChange={(e) => setRequiredUmpires(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white"
        />
      </label>

      <button
        type="submit"
        disabled={creating}
        className="h-12 w-full rounded-2xl bg-linear-to-r from-green-700 via-green-500 to-lime-500 text-sm font-semibold text-white shadow-lg shadow-green-900/40 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creating ? 'Creating…' : 'Create Match'}
      </button>
    </form>
  )
}

function SlotDetail({ matchId, slots, loading, error, onExpand }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    if (!expanded) onExpand(matchId)
    setExpanded((v) => !v)
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={toggle} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200">
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? 'Hide umpire status' : 'View umpire status'}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5">
          {loading && <p className="text-xs text-slate-400">Loading…</p>}
          {!loading && error && <p className="text-xs text-rose-300">{error}</p>}
          {!loading && !error && slots && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              {slots.map((slot, i) => {
                const { label, detail } = describeSlot(slot)
                return (
                  <div key={slot.id} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-slate-400">Umpire {i + 1}</span>
                    <span className={detail ? 'font-semibold text-white' : 'text-slate-500'}>
                      {label}
                      {detail && <span className="ml-1.5 text-emerald-300">· {detail}</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, slotsHook, lifecycleHook }) {
  const status = slotStatusInfo(match)
  const busy = lifecycleHook.lifecycleBusyId === match.id
  const result = lifecycleHook.lifecycleResults[match.id]
  const isDecided = match.status === 'completed' || match.status === 'finalized'
  const resultLine = isDecided
    ? formatMatchResultLine(
        match.result_type ? { resultType: match.result_type, winnerTeamId: match.winner_team_id, text: match.result } : null,
        { id: match.team_a_id, name: match.team_a_name },
        { id: match.team_b_id, name: match.team_b_name },
      )
    : null

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/50 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-white">
            {match.team_a_name} vs {match.team_b_name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <CalendarDays className="h-4 w-4 text-emerald-300" />
            {formatMatchDate(match.match_date)} · {formatMatchTime(match.match_date)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-slate-300">
          {statusLabel({ status: match.status })}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="font-semibold text-white">
          {match.filled_slots} / {match.total_slots}
        </span>
        <span>
          {status.emoji} {status.label}
        </span>
      </div>

      {match.total_slots > 0 && (
        <SlotDetail
          matchId={match.id}
          slots={slotsHook.slotsByMatch[match.id]}
          loading={slotsHook.loadingId === match.id}
          error={slotsHook.error}
          onExpand={slotsHook.load}
        />
      )}

      {isDecided && resultLine && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
          <Trophy className="h-4 w-4 shrink-0 text-amber-300" />
          {resultLine}
        </p>
      )}

      {result?.type === 'understaffed' && (
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Only {result.filledSlots} of {result.totalSlots} umpire slots are filled.
          <button
            type="button"
            disabled={busy}
            onClick={() => lifecycleHook.start(match.id, { confirmUnderstaffed: true })}
            className="ml-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start anyway
          </button>
        </div>
      )}
      {result?.type === 'error' && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-rose-300">{result.message}</p>}

      {match.status === 'upcoming' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => lifecycleHook.start(match.id)}
          className="mt-4 h-11 w-full rounded-2xl bg-linear-to-r from-green-700 via-green-500 to-lime-500 text-sm font-semibold text-white shadow-md shadow-green-900/40 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Starting…' : 'Match is Starting'}
        </button>
      )}
      {match.status === 'live' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => lifecycleHook.complete(match.id)}
          className="mt-4 h-11 w-full rounded-2xl border border-rose-400/30 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Ending…' : 'Match is Over'}
        </button>
      )}
    </div>
  )
}

export default function GroundMatchesPage() {
  const { publicGroundId } = useParams()
  const { grounds, loading: groundsLoading } = useMyGrounds()
  const groundMatches = useGroundMatches(publicGroundId)
  const { matches, loading, error, creating, createError, create, refresh } = groundMatches
  const slotsHook = useMatchUmpireSlots(publicGroundId)
  const [showForm, setShowForm] = useState(false)

  const ground = grounds.find((g) => g.public_ground_id === publicGroundId)

  return (
    <GroundOwnerLayout>
      <BackButton label="Back to Dashboard" fallback="/ground-owner/dashboard" />

      <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">{groundsLoading ? 'Loading…' : ground?.name || 'Ground'}</h1>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Matches</h2>
        {ground?.status === 'ACTIVE' && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            {showForm ? 'Cancel' : '+ Create Match'}
          </button>
        )}
      </div>

      {ground && ground.status !== 'ACTIVE' && (
        <p className="mt-2 text-sm text-amber-300">
          This ground is {ground.status.toLowerCase()} — matches can't be created for it until it's active.
        </p>
      )}

      {showForm && <CreateMatchForm onCreate={create} creating={creating} createError={createError} onDone={() => setShowForm(false)} />}

      <div className="mt-4">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5" />
            ))}
          </div>
        )}
        {!loading && error && <StatsErrorState message={error} onRetry={refresh} />}
        {!loading && !error && matches.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-16 text-center">
            <CalendarDays className="h-8 w-8 text-slate-500" />
            <p className="text-slate-300">No matches at this ground yet.</p>
          </div>
        )}
        {!loading && !error && matches.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} slotsHook={slotsHook} lifecycleHook={groundMatches} />
            ))}
          </div>
        )}
      </div>
    </GroundOwnerLayout>
  )
}
