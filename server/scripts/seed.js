// Optional dev seed: creates a few demo accounts with realistic stats so the
// leaderboard and profiles have data to show. Safe to run repeatedly.
//   npm run seed
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

const DEMO = [
  { username: 'speedy', avg: 118, peak: 142, games: 80, wins: 62, rating: 1320, country: 'US' },
  { username: 'keymaster', avg: 104, peak: 131, games: 65, wins: 44, rating: 1240, country: 'DE' },
  { username: 'swiftkeys', avg: 97, peak: 120, games: 50, wins: 31, rating: 1180, country: 'JP' },
  { username: 'fastfingers', avg: 88, peak: 110, games: 40, wins: 22, rating: 1110, country: 'FR' },
  { username: 'racer42', avg: 76, peak: 99, games: 30, wins: 14, rating: 1040, country: 'BR' },
  { username: 'novatyper', avg: 64, peak: 85, games: 22, wins: 8, rating: 980, country: 'IN' },
];

async function run() {
  await connectDB();
  for (const d of DEMO) {
    const usernameLower = d.username.toLowerCase();
    const existing = await User.findOne({ usernameLower });
    if (existing) {
      logger.info(`Skipping existing user: ${d.username}`);
      continue;
    }
    await User.create({
      username: d.username,
      usernameLower,
      email: `${usernameLower}@demo.typeracer`,
      password: 'password123', // hashed by pre-save hook
      country: d.country,
      gamesPlayed: d.games,
      wins: d.wins,
      losses: d.games - d.wins,
      averageWpm: d.avg,
      highestWpm: d.peak,
      averageAccuracy: 96.5,
      totalChars: d.games * 320,
      bestStreak: Math.round(d.wins / 4),
      currentStreak: 0,
      rating: d.rating,
      wpmSum: d.avg * d.games,
      accuracySum: 96.5 * d.games,
    });
    logger.info(`Created demo user: ${d.username} (password: password123)`);
  }
  await disconnectDB();
  logger.info('Seed complete.');
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
