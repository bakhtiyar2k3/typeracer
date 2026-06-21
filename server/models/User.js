import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { RatingConfig } from '../../shared/constants/game.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    // Lowercased copy for case-insensitive uniqueness and login lookups.
    usernameLower: { type: String, required: true, unique: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Never returned by default queries.
    password: { type: String, required: true, select: false },

    avatar: { type: String, default: '' },
    country: { type: String, default: '', maxlength: 56 },

    // Aggregate stats (denormalized for fast profile/leaderboard reads).
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    averageWpm: { type: Number, default: 0 },
    highestWpm: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    totalChars: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    rating: { type: Number, default: RatingConfig.START_RATING, index: true },

    // Hidden accumulators used to recompute averages incrementally.
    wpmSum: { type: Number, default: 0, select: false },
    accuracySum: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

userSchema.virtual('winRate').get(function winRate() {
  if (!this.gamesPlayed) return 0;
  return Math.round((this.wins / this.gamesPlayed) * 1000) / 10; // one decimal %
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

// Safe representation for API responses (no secrets).
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    username: this.username,
    avatar: this.avatar,
    country: this.country,
    gamesPlayed: this.gamesPlayed,
    wins: this.wins,
    losses: this.losses,
    averageWpm: this.averageWpm,
    highestWpm: this.highestWpm,
    averageAccuracy: this.averageAccuracy,
    totalChars: this.totalChars,
    currentStreak: this.currentStreak,
    bestStreak: this.bestStreak,
    rating: this.rating,
    winRate: this.winRate,
    createdAt: this.createdAt,
  };
};

userSchema.set('toJSON', { virtuals: true });

export const User = mongoose.model('User', userSchema);
