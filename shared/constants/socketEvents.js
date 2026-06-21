// Centralized Socket.io event names shared by client and server.
// Keeping these in one place guarantees both sides stay in sync (AI rule #8).

export const ClientEvents = Object.freeze({
  JOIN_QUEUE: 'joinQueue',
  LEAVE_QUEUE: 'leaveQueue',
  TYPING_UPDATE: 'typingUpdate',
  // `disconnect` is a reserved Socket.io event, handled implicitly.
});

export const ServerEvents = Object.freeze({
  QUEUE_JOINED: 'queueJoined',
  MATCH_FOUND: 'matchFound',
  COUNTDOWN: 'countdown',
  RACE_STARTED: 'raceStarted',
  PLAYER_UPDATE: 'playerUpdate',
  PLAYER_FINISHED: 'playerFinished',
  RACE_ENDED: 'raceEnded',
  LEADERBOARD_UPDATE: 'leaderboardUpdate',
  OPPONENT_LEFT: 'opponentLeft',
  ERROR: 'gameError',
});
