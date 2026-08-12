// Pure helpers for the "My Statistics" umpire page — no fetching here (the
// hook owns that), mirrors umpireDashboard.model.js's convention. Both
// helpers work directly off the raw GET /umpire/assignments response
// (models/matchUmpireSlot.model.js::findSlotsForUmpire on the backend) —
// no new endpoint, no fabricated numbers.

// "Matches This Month" — only assignments the umpire actually currently
// holds (status='ASSIGNED'; a CANCELLED slot isn't a match they're
// officiating), whose match falls in the current calendar month regardless
// of upcoming/live/completed, since the point is recency of activity.
export function matchesThisMonth(assignments, now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()
  return (assignments || []).filter((a) => {
    if (a.status !== 'ASSIGNED') return false
    const d = new Date(a.match_date)
    return d.getFullYear() === year && d.getMonth() === month
  }).length
}

// "Grounds Officiated At" — distinct grounds where a match this umpire held
// an ASSIGNED slot on has actually reached completed/finalized (genuinely
// officiated, not merely "currently holding a slot on an upcoming match").
export function groundsOfficiatedAt(assignments) {
  const grounds = new Set(
    (assignments || [])
      .filter((a) => a.status === 'ASSIGNED' && ['completed', 'finalized'].includes(a.match_status) && a.ground_name)
      .map((a) => a.ground_name),
  )
  return grounds.size
}
