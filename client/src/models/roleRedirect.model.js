export function getPostAuthPath(user) {
  if (!user) return '/login'
  if (user.role === 'staff') return '/canteen/staff'
  if (user.role === 'player') {
    if (!user.player_type) return '/player-type'
    if (user.player_type === 'umpire') return '/umpire'
    return '/canteen/menu'
  }
  return '/role-select'
}
