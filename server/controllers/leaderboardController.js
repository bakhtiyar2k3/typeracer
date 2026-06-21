import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LeaderboardConfig } from '../../shared/constants/game.js';

// Global leaderboard. Per spec: sorted by rating, with a minimum games filter,
// exposing WPM, peak WPM, win rate and games played. Guests are never stored
// as users, so they can never appear here.
export const getLeaderboard = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = LeaderboardConfig.PAGE_SIZE;
  const skip = (page - 1) * limit;

  const filter = { gamesPlayed: { $gte: LeaderboardConfig.MIN_GAMES } };

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ rating: -1, averageWpm: -1 })
      .skip(skip)
      .limit(limit)
      .select('username avatar country rating averageWpm highestWpm wins gamesPlayed'),
  ]);

  const rows = users.map((u, i) => ({
    rank: skip + i + 1,
    username: u.username,
    avatar: u.avatar,
    country: u.country,
    rating: u.rating,
    averageWpm: u.averageWpm,
    peakWpm: u.highestWpm,
    games: u.gamesPlayed,
    winRate: u.gamesPlayed ? Math.round((u.wins / u.gamesPlayed) * 1000) / 10 : 0,
  }));

  res.json({
    page,
    pageSize: limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    minGames: LeaderboardConfig.MIN_GAMES,
    leaderboard: rows,
  });
});
