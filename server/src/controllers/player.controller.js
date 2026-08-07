import { createPlayer, findPlayerByUserId, updatePlayer } from '../models/player.model.js'
import { PLAYING_ROLES, BATTING_STYLES, BOWLING_STYLES } from '../domain/player/playerEnums.js'

const EDITABLE_FIELDS = ['name', 'jersey_number', 'role', 'batting_style', 'bowling_style', 'city', 'bio', 'photo_url']

function validateFields(body) {
  const fields = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return { error: 'name cannot be empty.' }
    fields.name = name
  }
  if (body.role !== undefined) {
    if (body.role !== null && !PLAYING_ROLES.includes(body.role)) return { error: `role must be one of ${PLAYING_ROLES.join(', ')}` }
    fields.role = body.role
  }
  if (body.batting_style !== undefined) {
    if (body.batting_style !== null && !BATTING_STYLES.includes(body.batting_style)) return { error: `batting_style must be one of ${BATTING_STYLES.join(', ')}` }
    fields.batting_style = body.batting_style
  }
  if (body.bowling_style !== undefined) {
    if (body.bowling_style !== null && !BOWLING_STYLES.includes(body.bowling_style)) return { error: `bowling_style must be one of ${BOWLING_STYLES.join(', ')}` }
    fields.bowling_style = body.bowling_style
  }
  if (body.jersey_number !== undefined) {
    if (body.jersey_number !== null && (!Number.isInteger(body.jersey_number) || body.jersey_number < 0 || body.jersey_number > 999)) {
      return { error: 'jersey_number must be an integer between 0 and 999.' }
    }
    fields.jersey_number = body.jersey_number
  }
  if (body.city !== undefined) {
    fields.city = body.city === null ? null : String(body.city).trim().slice(0, 100)
  }
  if (body.bio !== undefined) {
    fields.bio = body.bio === null ? null : String(body.bio).trim().slice(0, 280)
  }
  if (body.photo_url !== undefined) {
    fields.photo_url = body.photo_url === null ? null : String(body.photo_url).trim()
  }

  return { fields }
}

export async function getMyPlayer(req, res, next) {
  try {
    const player = await findPlayerByUserId(req.user.id)
    res.json({ player })
  } catch (err) {
    next(err)
  }
}

export async function updateMyPlayer(req, res, next) {
  try {
    const body = {}
    for (const key of EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) body[key] = req.body[key]
    }

    const { fields, error } = validateFields(body)
    if (error) return res.status(400).json({ message: error })

    let player = await findPlayerByUserId(req.user.id)

    if (!player) {
      player = await createPlayer({
        name: fields.name || req.user.name,
        teamId: null,
        role: fields.role ?? null,
        battingStyle: fields.batting_style ?? null,
        bowlingStyle: fields.bowling_style ?? null,
        userId: req.user.id,
      })
      const remainingFields = { ...fields }
      delete remainingFields.name
      delete remainingFields.role
      delete remainingFields.batting_style
      delete remainingFields.bowling_style
      if (Object.keys(remainingFields).length > 0) {
        player = await updatePlayer(player.id, remainingFields)
      }
    } else if (Object.keys(fields).length > 0) {
      player = await updatePlayer(player.id, fields)
    }

    res.json({ player })
  } catch (err) {
    next(err)
  }
}
