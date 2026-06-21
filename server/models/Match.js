import mongoose from 'mongoose';

const { Schema } = mongoose;

// Embedded per-player result. Mirrors the shared RaceResult type.
const resultSchema = new Schema(
  {
    // String to accommodate both registered user ObjectIds and guest ids.
    userId: { type: String, required: true },
    username: { type: String, required: true },
    placement: { type: Number, required: true },
    wpm: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    correctChars: { type: Number, default: 0 },
    pointsGained: { type: Number, default: 0 },
    newRating: { type: Number, required: true },
    guest: { type: Boolean, default: false },
  },
  { _id: false }
);

const matchSchema = new Schema(
  {
    roomId: { type: String, required: true, index: true },
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // The word stream used for this race, stored joined for history display.
    text: { type: String, required: true },
    winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    results: { type: [resultSchema], default: [] },
    duration: { type: Number, default: 0 }, // race length in ms
  },
  { timestamps: true }
);

// Fast "recent matches for a user" lookups for profile/history.
matchSchema.index({ players: 1, createdAt: -1 });

export const Match = mongoose.model('Match', matchSchema);
