import {
  findPendingUmpireRequests,
  findLatestUmpireRequestForUser,
  decideUmpireRequest,
} from '../models/umpireRequest.model.js'

export async function listPending(req, res, next) {
  try {
    const requests = await findPendingUmpireRequests()
    res.json(requests)
  } catch (err) {
    next(err)
  }
}

export async function getMine(req, res, next) {
  try {
    const request = await findLatestUmpireRequestForUser(req.user.id)
    res.json({ request })
  } catch (err) {
    next(err)
  }
}

export async function decide(req, res, next) {
  try {
    const { status } = req.body
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" })
    }

    const request = await decideUmpireRequest(req.params.id, status, req.user.id)
    if (!request) {
      return res.status(404).json({ message: 'Umpire request not found.' })
    }

    res.json({ request })
  } catch (err) {
    next(err)
  }
}
