import bcrypt from 'bcryptjs'
import { createUser, findUserByEmail, updateUser } from '../models/user.model.js'
import { createUmpireRequest, findLatestUmpireRequestForUser } from '../models/umpireRequest.model.js'
import { signToken } from '../utils/jwt.js'

function toPublicUser(user) {
  const { password_hash, ...publicUser } = user
  return publicUser
}

export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await createUser({ name, email, passwordHash })
    const token = signToken({ id: user.id })

    res.status(201).json({ token, user })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' })
    }

    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = signToken({ id: user.id })
    res.json({ token, user: toPublicUser(user) })
  } catch (err) {
    next(err)
  }
}

export async function me(req, res) {
  res.json({ user: req.user })
}

export async function selectRole(req, res, next) {
  try {
    const { role } = req.body
    if (!['player', 'staff'].includes(role)) {
      return res.status(400).json({ message: "role must be 'player' or 'staff'" })
    }

    const user = await updateUser(req.user.id, { role })
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

export async function selectPlayerType(req, res, next) {
  try {
    const { playerType } = req.body
    if (!['team_player', 'umpire'].includes(playerType)) {
      return res.status(400).json({ message: "playerType must be 'team_player' or 'umpire'" })
    }
    if (req.user.role !== 'player') {
      return res.status(403).json({ message: 'Only players can select a player type.' })
    }

    const user = await updateUser(req.user.id, { player_type: playerType })

    if (playerType === 'umpire') {
      const latest = await findLatestUmpireRequestForUser(req.user.id)
      if (!latest || latest.status === 'rejected') {
        await createUmpireRequest(req.user.id)
      }
    }

    res.json({ user })
  } catch (err) {
    next(err)
  }
}
