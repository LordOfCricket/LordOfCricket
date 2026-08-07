import bcrypt from 'bcryptjs'
import { findUserByEmail, createStaffUser } from '../models/user.model.js'
import { findStaffRoleByName } from '../models/staffRole.model.js'

const CREATABLE_STAFF_ROLES = ['admin', 'canteen_staff']

export async function createStaff(req, res, next) {
  try {
    const { name, email, password, staffId, role } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })
    }
    if (!CREATABLE_STAFF_ROLES.includes(role)) {
      return res.status(400).json({ message: "role must be 'admin' or 'canteen_staff'" })
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }

    const staffRole = await findStaffRoleByName(role)
    const passwordHash = await bcrypt.hash(password, 10)

    try {
      const user = await createStaffUser({ name, email, passwordHash, staffId: staffId || null, staffRoleId: staffRole.id })
      res.status(201).json({ user })
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'That Staff ID is already in use.' })
      }
      throw err
    }
  } catch (err) {
    next(err)
  }
}
