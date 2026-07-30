import mongoose from 'mongoose'

const commentarySchema = new mongoose.Schema(
  {
    matchId: { type: Number, required: true, index: true },
    innings: { type: Number, required: true },
    over: { type: Number, required: true },
    ball: { type: Number, required: true },
    bowler: { type: String },
    batsman: { type: String },
    event: {
      type: String,
      enum: ['dot', 'run', 'four', 'six', 'wicket', 'wide', 'no-ball', 'bye', 'leg-bye'],
      default: 'run',
    },
    runs: { type: Number, default: 0 },
    text: { type: String, required: true },
  },
  { timestamps: true }
)

commentarySchema.index({ matchId: 1, innings: 1, over: 1, ball: 1 })

export default mongoose.model('Commentary', commentarySchema)
