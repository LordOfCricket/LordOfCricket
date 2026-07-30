import pg from 'pg'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
})

export async function connectPostgres() {
  try {
    const res = await pool.query('SELECT NOW()')
    console.log('✅ Postgres connected:', res.rows[0].now)
  } catch (err) {
    console.error('❌ Postgres connection failed:', err.message)
    process.exit(1)
  }
}

export async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ MongoDB connected')
  } catch (err) {
    console.error('⚠️  MongoDB connection failed (continuing without it):', err.message)
  }
}

export function isMongoReady() {
  return mongoose.connection.readyState === 1
}