import express from 'express'
import { listNearbyGrounds, listGroundsByCity, listAllGrounds, getGroundProfile } from '../controllers/ground.controller.js'

const router = express.Router()

// All public, no auth — ground discovery has to work for a logged-out
// visitor deciding which ground to even sign in for.
//
// /nearby and /search MUST both be registered before /:publicGroundId in
// this file (same footgun documented in routes/index.js for players'/teams'
// /compare route — Express matches routes in registration order, and
// /:publicGroundId would otherwise swallow the literal segments). The bare
// '/' doesn't have this problem (:publicGroundId requires exactly one path
// segment, '/' has zero), but is kept alongside them for readability.
router.get('/nearby', listNearbyGrounds)
// Phase 13 (post-report revision) — city-based discovery, the frontend's
// primary path now (listNearbyGrounds/lat-lng above is left intact but
// unused by the frontend — see ground.model.js's findActiveGroundsByCity).
router.get('/search', listGroundsByCity)
// "Grounds already registered on LOC" — the platform homepage's default
// browse list below the hero, no search required.
router.get('/', listAllGrounds)
router.get('/:publicGroundId', getGroundProfile)

export default router
