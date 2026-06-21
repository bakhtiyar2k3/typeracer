import { RatingConfig } from '../../shared/constants/game.js';

const MIN_RATING = 100;

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Opponent-aware Elo for a head-to-head race.
 * Beating a stronger player earns more; losing to a weaker player costs more.
 * Base deltas follow the spec (+20 win / -10 loss) and are nudged by K_FACTOR.
 *
 * @param {number} winnerRating
 * @param {number} loserRating
 * @returns {{ winner: { delta: number, newRating: number }, loser: { delta: number, newRating: number } }}
 */
export function computeHeadToHead(winnerRating, loserRating) {
  const eWinner = expectedScore(winnerRating, loserRating);
  const eLoser = expectedScore(loserRating, winnerRating);

  // Adjustment is centered at the even matchup (E = 0.5) so two equally-rated
  // players resolve to exactly the spec base (+20 / -10). Beating a stronger
  // opponent (E < 0.5) adds a bonus; losing as the favourite (E > 0.5) costs more.
  const winnerDelta = clamp(
    Math.round(RatingConfig.WIN_DELTA + RatingConfig.K_FACTOR * (0.5 - eWinner)),
    10,
    40
  );
  const loserDelta = clamp(
    Math.round(RatingConfig.LOSS_DELTA + RatingConfig.K_FACTOR * (0.5 - eLoser)),
    -30,
    -3
  );

  return {
    winner: { delta: winnerDelta, newRating: Math.max(MIN_RATING, winnerRating + winnerDelta) },
    loser: { delta: loserDelta, newRating: Math.max(MIN_RATING, loserRating + loserDelta) },
  };
}
