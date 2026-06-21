import { User } from '../models/User.js';
import { Match } from '../models/Match.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HistoryConfig } from '../../shared/constants/game.js';

// Computes a user's global rank (1-based) by rating among rated players.
async function computeRank(user) {
  const higher = await User.countDocuments({ rating: { $gt: user.rating } });
  return higher + 1;
}

function shapeMatchesForUser(matches, userId) {
  return matches.map((m) => {
    const mine = m.results.find((r) => r.userId === userId);
    const opponents = m.results
      .filter((r) => r.userId !== userId)
      .map((r) => ({ username: r.username, wpm: r.wpm, placement: r.placement }));
    return {
      id: m._id.toString(),
      roomId: m.roomId,
      date: m.createdAt,
      duration: m.duration,
      text: m.text,
      placement: mine?.placement ?? null,
      wpm: mine?.wpm ?? 0,
      accuracy: mine?.accuracy ?? 0,
      pointsGained: mine?.pointsGained ?? 0,
      opponents,
    };
  });
}

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({ usernameLower: req.params.username.toLowerCase() });
  if (!user) throw ApiError.notFound('User not found');

  const [rank, recentMatches] = await Promise.all([
    computeRank(user),
    Match.find({ players: user._id }).sort({ createdAt: -1 }).limit(HistoryConfig.RECENT_MATCHES),
  ]);

  res.json({
    user: { ...user.toPublicJSON(), rank },
    recentMatches: shapeMatchesForUser(recentMatches, user._id.toString()),
  });
});

export const getMyHistory = asyncHandler(async (req, res) => {
  const matches = await Match.find({ players: req.user._id })
    .sort({ createdAt: -1 })
    .limit(HistoryConfig.RECENT_MATCHES);
  res.json({ matches: shapeMatchesForUser(matches, req.user._id.toString()) });
});
