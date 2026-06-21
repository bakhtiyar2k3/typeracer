// JSDoc typedefs describing the shape of every socket payload.
// Documentation-only (plain JS) but keeps client/server payloads aligned.

/**
 * @typedef {Object} MatchPlayer
 * @property {string} userId
 * @property {string} username
 * @property {number} rating
 * @property {string} caretColor
 * @property {boolean} guest
 */

/**
 * @typedef {Object} MatchFoundPayload  server -> room
 * @property {string} roomId
 * @property {string[]} words            shared word stream (identical for both)
 * @property {number} duration           race length in ms
 * @property {MatchPlayer[]} players
 */

/**
 * @typedef {Object} RaceStartedPayload  server -> room
 * @property {string} roomId
 * @property {number} startedAt          server epoch ms
 * @property {number} duration           ms
 */

/**
 * @typedef {Object} TypingUpdatePayload  client -> server
 * @property {string} roomId
 * @property {string} userId
 * @property {number} cursorPosition     canonical char index into words.join(' ')
 * @property {number} correctChars
 * @property {number} mistakes
 * @property {number} wpm
 * @property {number} accuracy           0..100
 */

/**
 * @typedef {Object} PlayerUpdatePayload  server -> room
 * @property {string} userId
 * @property {number} cursorPosition
 * @property {number} wpm
 * @property {number} correctChars
 */

/**
 * @typedef {Object} RaceResult
 * @property {string} userId
 * @property {string} username
 * @property {number} placement
 * @property {number} wpm
 * @property {number} accuracy           0..100
 * @property {number} correctChars
 * @property {number} pointsGained
 * @property {number} newRating
 * @property {boolean} guest
 */

/**
 * @typedef {Object} RaceEndedPayload  server -> room
 * @property {string} roomId
 * @property {RaceResult[]} results
 */

/**
 * @typedef {Object} OpponentLeftPayload  server -> room (race aborted, no result)
 * @property {string} userId
 * @property {string} username
 * @property {boolean} aborted
 */

export {}; // module marker
