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
