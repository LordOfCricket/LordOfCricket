import express from 'express'
import { listNearbyGrounds, getGroundProfile } from '../controllers/ground.controller.js'

const router = express.Router()

// Both public, no auth — ground discovery has to work for a logged-out
// visitor deciding which ground to even sign in for.
//
// /nearby MUST be registered before /:publicGroundId in this file (same
// footgun documented in routes/index.js for players'/teams' /compare route
// — Express matches routes in registration order, and /:publicGroundId
// would otherwise swallow the literal segment "nearby").
router.get('/nearby', listNearbyGrounds)
router.get('/:publicGroundId', getGroundProfile)

export default router
