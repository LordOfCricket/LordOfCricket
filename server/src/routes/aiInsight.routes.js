import { Router } from 'express'
import { requireAuth, requireRole } from '../middlewares/auth.js'
import { getMatchInsight, getPlayerInsight, getTeamInsight, regenerateMatchInsight, regeneratePlayerInsight, regenerateTeamInsight } from '../controllers/aiInsight.controller.js'

// Phase 16 — mounted onto the EXISTING /matches, /players, /teams route
// prefixes (routes/index.js), matching every other feature-specific route
// file already mounted alongside a base resource's own router (e.g.
// matchAvailabilityRoutes onto /matches).

export const matchAIInsightRoutes = Router()
matchAIInsightRoutes.get('/:id/ai-insight', getMatchInsight)
matchAIInsightRoutes.post('/:id/ai-insight/regenerate', requireAuth, requireRole('staff'), regenerateMatchInsight)

export const playerAIInsightRoutes = Router()
playerAIInsightRoutes.get('/:publicPlayerId/ai-insight', getPlayerInsight)
playerAIInsightRoutes.post('/:publicPlayerId/ai-insight/regenerate', requireAuth, requireRole('staff'), regeneratePlayerInsight)

export const teamAIInsightRoutes = Router()
teamAIInsightRoutes.get('/:id/ai-insight', getTeamInsight)
teamAIInsightRoutes.post('/:id/ai-insight/regenerate', requireAuth, requireRole('staff'), regenerateTeamInsight)
