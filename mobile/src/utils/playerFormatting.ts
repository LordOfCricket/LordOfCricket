// Utility functions for displaying player data
import { PlayingRole, BattingStyle, BowlingStyle } from '../domain/playerEnums'

/**
 * Format enum values to human-readable strings
 * Example: RIGHT_HAND → Right Hand
 */
export function formatEnumValue(value: string | null | undefined): string | null {
  if (!value) return null
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Format cricket role for display
 */
export function formatRole(role: string | PlayingRole | null | undefined): string | null {
  if (!role) return null
  const roleNames: Record<string, string> = {
    BATSMAN: 'Batsman',
    BOWLER: 'Bowler',
    ALL_ROUNDER: 'All Rounder',
    WICKET_KEEPER: 'Wicket Keeper',
    WICKET_KEEPER_BATSMAN: 'Wicket Keeper Batsman',
  }
  return roleNames[role] || formatEnumValue(role)
}

/**
 * Format batting style for display
 */
export function formatBattingStyle(style: string | BattingStyle | null | undefined): string | null {
  if (!style) return null
  const styleNames: Record<string, string> = {
    RIGHT_HAND: 'Right Hand',
    LEFT_HAND: 'Left Hand',
  }
  return styleNames[style] || formatEnumValue(style)
}

/**
 * Format bowling style for display
 */
export function formatBowlingStyle(style: string | BowlingStyle | null | undefined): string | null {
  if (!style) return null
  const styleNames: Record<string, string> = {
    RIGHT_ARM_FAST: 'Right Arm Fast',
    RIGHT_ARM_MEDIUM: 'Right Arm Medium',
    RIGHT_ARM_OFF_BREAK: 'Right Arm Off Break',
    RIGHT_ARM_LEG_BREAK: 'Right Arm Leg Break',
    LEFT_ARM_FAST: 'Left Arm Fast',
    LEFT_ARM_MEDIUM: 'Left Arm Medium',
    LEFT_ARM_ORTHODOX: 'Left Arm Orthodox',
    LEFT_ARM_WRIST_SPIN: 'Left Arm Wrist Spin',
    NONE: 'None',
  }
  return styleNames[style] || formatEnumValue(style)
}

/**
 * Format date string for display
 * Input: YYYY-MM-DD
 * Output: Jan 1, 2000
 */
export function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null
  try {
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age >= 0 ? age : null
  } catch {
    return null
  }
}

/**
 * Format statistics values with appropriate decimals
 */
export function formatStatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  if (Number.isInteger(value)) return value.toString()
  return value.toFixed(2)
}
