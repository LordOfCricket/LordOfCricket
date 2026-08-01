export const PLAYING_ROLE_LABELS = {
  BATSMAN: 'Batsman',
  BOWLER: 'Bowler',
  ALL_ROUNDER: 'All-Rounder',
  WICKET_KEEPER: 'Wicket-Keeper',
  WICKET_KEEPER_BATSMAN: 'Wicket-Keeper Batsman',
}

export const BATTING_STYLE_LABELS = {
  RIGHT_HAND: 'Right-hand bat',
  LEFT_HAND: 'Left-hand bat',
}

export const BOWLING_STYLE_LABELS = {
  RIGHT_ARM_FAST: 'Right-arm fast',
  RIGHT_ARM_MEDIUM: 'Right-arm medium',
  RIGHT_ARM_OFF_BREAK: 'Right-arm off break',
  RIGHT_ARM_LEG_BREAK: 'Right-arm leg break',
  LEFT_ARM_FAST: 'Left-arm fast',
  LEFT_ARM_MEDIUM: 'Left-arm medium',
  LEFT_ARM_ORTHODOX: 'Left-arm orthodox',
  LEFT_ARM_WRIST_SPIN: 'Left-arm wrist spin',
  NONE: 'Does not bowl',
}

export function roleLabel(role) {
  return (role && PLAYING_ROLE_LABELS[role]) || null
}

export function battingStyleLabel(style) {
  return (style && BATTING_STYLE_LABELS[style]) || null
}

export function bowlingStyleLabel(style) {
  return (style && BOWLING_STYLE_LABELS[style]) || null
}

export function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const COMPLETION_FIELDS = ['role', 'batting_style', 'photo_url', 'city', 'jersey_number']

export function profileCompletion(player) {
  if (!player) return 0
  const filled = COMPLETION_FIELDS.filter((field) => player[field] !== null && player[field] !== undefined && player[field] !== '')
  return Math.round((filled.length / COMPLETION_FIELDS.length) * 100)
}

// Which career stats matter most for a given playing role — used to prioritize
// the Career Overview / Statistics UI once real aggregation exists. Batting
// stats are the safe fallback for roles that haven't been set yet.
export function statPriorityForRole(role) {
  switch (role) {
    case 'BOWLER':
      return ['wickets', 'economy', 'average', 'bestBowling']
    case 'ALL_ROUNDER':
      return ['runs', 'wickets', 'average', 'economy']
    case 'WICKET_KEEPER':
    case 'WICKET_KEEPER_BATSMAN':
      return ['runs', 'catches', 'stumpings']
    case 'BATSMAN':
    default:
      return ['runs', 'average', 'strikeRate', 'highestScore']
  }
}
