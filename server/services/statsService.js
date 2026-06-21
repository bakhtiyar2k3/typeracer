import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Match } from '../models/Match.js';
import { computeHeadToHead } from './ratingService.js';
import { logger } from '../utils/logger.js';

/**
 * @typedef {Object} RacePlayerResult
 * @property {string} userId
 * @property {string} username
 * @property {boolean} guest
 * @property {number} rating          pre-match rating snapshot
 * @property {number} wpm
 * @property {number} accuracy        0..100
 * @property {number} correctChars
 */

// Timed race: rank by correct characters typed (i.e. WPM), ties broken by
// accuracy. Whoever typed the most correct text in the fixed window wins.
function rankResults(results) {
  return [...results]
    .sort((a, b) => b.correctChars - a.correctChars || b.accuracy - a.accuracy)
    .map((r, i) => ({ ...r, placement: i + 1 }));
}

function applyUserStats(userDoc, r, deltaInfo) {
  userDoc.gamesPlayed += 1;
  const won = r.placement === 1;
  if (won) {
    userDoc.wins += 1;
    userDoc.currentStreak += 1;
    userDoc.bestStreak = Math.max(userDoc.bestStreak, userDoc.currentStreak);
  } else {
    userDoc.losses += 1;
    userDoc.currentStreak = 0;
  }

  userDoc.wpmSum += r.wpm;
  userDoc.accuracySum += r.accuracy;
  userDoc.averageWpm = Math.round((userDoc.wpmSum / userDoc.gamesPlayed) * 10) / 10;
  userDoc.averageAccuracy = Math.round((userDoc.accuracySum / userDoc.gamesPlayed) * 10) / 10;
  userDoc.highestWpm = Math.max(userDoc.highestWpm, r.wpm);
  userDoc.totalChars += Math.max(0, r.correctChars || 0);
  userDoc.rating = deltaInfo.newRating;
}

/**
 * Persist a completed timed race: compute placements + Elo, update each
 * registered user's aggregate stats, and store the Match document.
 *
 * @param {{ roomId: string, text: string, duration: number, players: RacePlayerResult[] }} race
 */
export async function recordMatch({ roomId, text, duration, players }) {
  const ranked = rankResults(players);

  // Elo only applies between two DISTINCT registered (non-guest) users.
  const registered = ranked.filter((r) => !r.guest);
  const distinct = new Set(registered.map((r) => r.userId));
  const deltas = new Map(); // userId -> { delta, newRating }

  if (registered.length === 2 && distinct.size === 2) {
    const winner = registered.find((r) => r.placement === 1) || registered[0];
    const loser = registered.find((r) => r !== winner);
    const { winner: w, loser: l } = computeHeadToHead(winner.rating, loser.rating);
    deltas.set(winner.userId, w);
    deltas.set(loser.userId, l);
  }

  for (const r of ranked) {
    if (!deltas.has(r.userId)) deltas.set(r.userId, { delta: 0, newRating: r.rating });
  }

  const finalResults = ranked.map((r) => {
    const d = deltas.get(r.userId);
    return {
      userId: r.userId,
      username: r.username,
      placement: r.placement,
      wpm: r.wpm,
      accuracy: r.accuracy,
      correctChars: r.correctChars,
      pointsGained: r.guest ? 0 : d.delta,
      newRating: r.guest ? r.rating : d.newRating,
      guest: r.guest,
    };
  });

  try {
    await persistUsers(ranked, deltas);
  } catch (err) {
    logger.error('Failed updating user stats:', err.message);
  }

  let match = null;
  try {
    const winnerResult = finalResults.find((r) => r.placement === 1 && !r.guest);
    match = await Match.create({
      roomId,
      text,
      duration,
      players: ranked
        .filter((r) => !r.guest)
        .map((r) => new mongoose.Types.ObjectId(r.userId)),
      winner: winnerResult ? new mongoose.Types.ObjectId(winnerResult.userId) : null,
      results: finalResults,
    });
  } catch (err) {
    logger.error('Failed persisting match:', err.message);
  }

  return { results: finalResults, match };
}

async function persistUsers(ranked, deltas) {
  for (const r of ranked) {
    if (r.guest) continue;
    const user = await User.findById(r.userId).select('+wpmSum +accuracySum');
    if (!user) continue;
    applyUserStats(user, r, deltas.get(r.userId));
    await user.save();
  }
}
