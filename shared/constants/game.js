// Gameplay tuning constants used across both client and server so that
// timing, scoring and matchmaking stay consistent everywhere.

export const GameConfig = Object.freeze({
  // Matchmaking
  PLAYERS_PER_MATCH: 2,
  QUEUE_TIMEOUT_MS: 60_000, // give up waiting after 60s (client can re-queue)

  // Countdown shown before a race ("3,2,1,GO")
  COUNTDOWN_FROM: 3,
  COUNTDOWN_INTERVAL_MS: 1000,

  // Live caret broadcast cadence. Server relays; client interpolates.
  UPDATE_BROADCAST_MS: 40, // within the required 30-50ms window

  // Timed race: fixed duration, infinite words. Winner = highest WPM at time-up.
  RACE_DURATION_MS: 30_000,
  // Small buffer after the duration before the server finalizes, so each
  // client's last typing update at the buzzer is counted.
  RACE_END_BUFFER_MS: 600,
  // Words generated per race — enough for 30s even at very high WPM.
  WORDS_PER_RACE: 400,

  // Solo practice durations (seconds) offered on the home page selector.
  SOLO_DURATIONS: [15, 30, 60],
  SOLO_WORDS_PER_SECOND: 7, // word buffer sizing for solo tests

  // Memory cleanup: rooms idle this long are reaped as a safety net.
  ROOM_IDLE_TTL_MS: 5 * 60_000,
});

export const RatingConfig = Object.freeze({
  START_RATING: 1000,
  WIN_DELTA: 20,
  LOSS_DELTA: -10,
  // Opponent-relative adjustment factor (simple Elo-style nudging).
  K_FACTOR: 16,
});

export const LeaderboardConfig = Object.freeze({
  MIN_GAMES: 20,
  PAGE_SIZE: 50,
});

export const HistoryConfig = Object.freeze({
  RECENT_MATCHES: 20,
});
