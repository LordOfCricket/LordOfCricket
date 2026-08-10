// Phase 16 Part 20/21 — AI-generated narrative content is exactly the
// "generated/unstructured content" case the Phase 15/16 spec calls out for
// MongoDB (canteen's existing home): PostgreSQL remains authoritative for
// every cricket fact this document only NARRATES, never decides. This
// collection is a cache/read-model — deleting it and regenerating on next
// request loses nothing authoritative, unlike any PostgreSQL table in this
// app.
//
// `sourceFingerprint` ties one cached insight to the exact authoritative
// state it was generated from (domain/ai/computeSourceFingerprint.js) — a
// correction, a new finalized match, or new career-stat-affecting data
// changes the fingerprint, and the service layer treats a fingerprint
// mismatch as stale (Part 22/23), never serving it as current.
import mongoose from 'mongoose'

const aiInsightSchema = new mongoose.Schema(
  {
    sourceType: { type: String, required: true, enum: ['MATCH', 'PLAYER', 'TEAM'] },
    sourceId: { type: String, required: true }, // matchId, publicPlayerId, or teamId as a string
    sourceFingerprint: { type: String, required: true },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }, // the validated structured insight
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

aiInsightSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true })

export default mongoose.model('AiInsight', aiInsightSchema)
