import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to seed test accounts in production')
  process.exit(1)
}

const TEST_USERS = [
  { name: 'Test Player', email: 'player@email', password: 'password', role: 'player', playerType: 'team_player' },
  { name: 'Test Staff', email: 'staff@email', password: 'password', role: 'staff', playerType: null },
]

async function seed() {
  for (const user of TEST_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, player_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           player_type = EXCLUDED.player_type`,
      [user.name, user.email, passwordHash, user.role, user.playerType]
    )
    console.log(`✅ Seeded ${user.role} test account: ${user.email} / ${user.password}`)
  }
  await pool.end()
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message)
  process.exit(1)
})
