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
// CanteenEntryRedirect.jsx still use getPostAuthPath directly for those,
// unchanged.
//
// A fully set-up account now lands on the homepage ('/', DiscoveryPage —
// see routes/AppRoutes.jsx) regardless of role, not a role-specific
// dashboard. Deliberately NOT a call to getPostAuthPath anymore (that
// function is untouched and keeps its own real dashboard destinations —
// route guards/dispatchers still need those, only the post-login moment
// doesn't). An incomplete account still goes through its required setup
// step first (role-select / player-type) before ever reaching the
// homepage — same mandatory-setup detection getPostAuthPath uses, kept
// here rather than delegated so this function's own destination for a
// complete account can differ from getPostAuthPath's without touching it.
//
// MFA is untouched by this and was never login-gated in the first place
// (see docs/AUTH.md's Phase 6 note: "MFA is enforced only at the point a
// privileged action is attempted, never at login") — a Staff/Super Admin
// account landing on the public homepage doesn't skip MFA, it just means
// the MFA prompt now surfaces the moment they navigate to an actual
// MFA-gated destination (e.g. /admin/dashboard) instead of immediately at
// login, which is the original, documented design this function's
// previous "delegate to getPostAuthPath" version had incidentally moved
// away from as a side effect of using getPostAuthPath's own
// dashboard-specific destinations.
export function getPostLoginPath(user) {
  if (!user) return '/login'
  if (user.role === 'user') return '/role-select'
  if (user.role === 'player' && !user.player_type) return '/player-type'
  return '/'
}
