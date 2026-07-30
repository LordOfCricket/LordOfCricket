import { STATS, GROUND_ADDRESS } from '../models/homepage.model.js'

export function useHomePage() {
  return {
    stats: STATS,
    groundAddress: GROUND_ADDRESS,
    currentYear: new Date().getFullYear(),
  }
}
