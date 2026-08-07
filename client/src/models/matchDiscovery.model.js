// Phase 10 Part 1 — centralized public match-discovery labels/formatting
// (Part 15/3): every surface (MatchCard, MatchesPage, homepage previews)
// imports from here instead of re-deriving its own status text. Mirrors the
// same four labels Phase 9's MatchHero.jsx already established, kept as an
// independent copy here (this is presentation text for the NEW discovery
// surfaces, not a change to the existing Match Summary read model).

export const STATUS_LABEL = {
  upcoming: 'Upcoming',
  live: 'Live',
  completed: 'Awaiting Finalization',
  finalized: 'Official Result',
}

export function statusLabel(match) {
  if (match.isInningsBreak) return 'Innings Break'
  return STATUS_LABEL[match.status] || match.status
}

export const CATEGORIES = [
  { key: 'LIVE', label: 'Live' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'RESULTS', label: 'Results' },
]

export function formatMatchDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatMatchTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatOversFormat(oversPerInnings) {
  return oversPerInnings != null ? `${oversPerInnings} overs` : null
}
