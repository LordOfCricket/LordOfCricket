import { findAvailableMatchesForUmpire, findSlotsForUmpire, getUmpireStats } from '../models/matchUmpireSlot.model.js'
import { getOrCreateUmpireProfile, updateUmpireProfile } from '../models/umpireProfile.model.js'

export async function listAvailableMatches() {
  return findAvailableMatchesForUmpire()
}

export async function listMyAssignments(userId) {
  return findSlotsForUmpire(userId)
}

export async function getMyProfile(userId) {
  const [profile, stats] = await Promise.all([getOrCreateUmpireProfile(userId), getUmpireStats(userId)])
  return { ...profile, ...stats }
}

export async function updateMyProfile(userId, fields) {
  const profile = await updateUmpireProfile(userId, fields)
  const stats = await getUmpireStats(userId)
  return { ...profile, ...stats }
}
