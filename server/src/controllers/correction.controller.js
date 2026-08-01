import * as correctionService from '../services/correction.service.js'

function parseTarget(body) {
  const { targetType, targetId, patch } = body
  if (!['delivery', 'event'].includes(targetType)) {
    return { error: "targetType must be 'delivery' or 'event'." }
  }
  if (targetId == null) return { error: 'targetId is required.' }
  if (!patch || typeof patch !== 'object') return { error: 'patch is required.' }
  return { targetType, targetId, patch }
}

export async function previewCorrection(req, res, next) {
  try {
    const parsed = parseTarget(req.body)
    if (parsed.error) return res.status(400).json({ message: parsed.error })

    const result = await correctionService.previewCorrection({ inningsId: req.params.inningsId, ...parsed })
    if (!result) return res.status(404).json({ message: 'Innings not found.' })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function applyCorrection(req, res, next) {
  try {
    const parsed = parseTarget(req.body)
    if (parsed.error) return res.status(400).json({ message: parsed.error })
    const { reasonCode, note, expectedVersion, clientActionId } = req.body
    if (!reasonCode) return res.status(400).json({ message: 'reasonCode is required.' })

    const result = await correctionService.applyCorrection({
      inningsId: req.params.inningsId,
      ...parsed,
      reasonCode,
      note: note ?? null,
      expectedVersion: expectedVersion ?? null,
      clientActionId: clientActionId ?? null,
      correctedByUserId: req.user.id,
    })
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function listCorrections(req, res, next) {
  try {
    const corrections = await correctionService.listCorrections(req.params.inningsId)
    res.json({ corrections })
  } catch (err) {
    next(err)
  }
}

export async function undoCorrection(req, res, next) {
  try {
    const { expectedVersion, clientActionId } = req.body
    const result = await correctionService.undoCorrection({
      inningsId: req.params.inningsId,
      correctionId: req.params.correctionId,
      expectedVersion: expectedVersion ?? null,
      clientActionId: clientActionId ?? null,
      correctedByUserId: req.user.id,
    })
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}
