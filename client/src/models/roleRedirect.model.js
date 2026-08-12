export function getPostAuthPath(user) {
  if (!user) return '/login'
  if (user.role === 'staff') {
    if (user.staff_role === 'admin' || user.staff_role === 'super_admin') return '/admin/dashboard'
    // canteen_staff, or a legacy/unassigned staff row (staff_role null) —
    // keep today's behavior rather than a dead end.
    return '/canteen/staff'
  }
  if (user.role === 'player') {
    if (!user.player_type) return '/player-type'
    if (user.player_type === 'umpire') return '/umpire'
    return '/player/dashboard'
  }
  return '/role-select'
}

// Only for "just finished authenticating/onboarding" moments
// (useAuthPage.js's post-login/signup navigate, usePlayerTypeSelect.js's
// post-setup navigate) — never for a route-guard's unauthorized-fallback or
// a persistent role dispatcher. RequireStaffRole.jsx and
// CanteenEntryRedirect.jsx both still use getPostAuthPath itself for those,
// unchanged — swapping them to this function would silently change where an
// unauthorized staff user or the /canteen entry point lands, which has
// nothing to do with a login redirect. Mirrors getPostAuthPath's exact
// mandatory-setup detection (an incomplete account still lands on the
// required step first) but a fully set-up account lands on the homepage
// instead of a role-specific dashboard.
export function getPostLoginPath(user) {
  if (!user) return '/login'
  if (user.role === 'user') return '/role-select'
  if (user.role === 'player' && !user.player_type) return '/player-type'
  return '/'
}
