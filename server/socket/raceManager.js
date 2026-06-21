import crypto from 'node:crypto';
import { ServerEvents } from '../../shared/constants/socketEvents.js';
import { GameConfig, Theme } from '../../shared/constants/index.js';
import { wordService } from '../services/wordService.js';
import { recordMatch } from '../services/statsService.js';
import { logger } from '../utils/logger.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function raceDuration() {
  // Env override lets the smoke test run short races.
  return Number(process.env.RACE_DURATION_MS) || GameConfig.RACE_DURATION_MS;
}

/**
 * Owns every active race room. Timed model: a fixed-duration race over an
 * infinite word stream; highest WPM at time-up wins. If a player is ever left
 * alone (leave / disconnect / refresh) the race is aborted immediately with NO
 * results recorded — the survivor is told "opponent left" and freed.
 */
export class RaceManager {
  constructor(io) {
    this.io = io;
    /** @type {Map<string, any>} roomId -> room state */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId -> roomId */
    this.socketRoom = new Map();
  }

  createRoom(matchPlayers) {
    const roomId = `race_${crypto.randomUUID().slice(0, 8)}`;
    const words = wordService.forRace();
    const text = words.join(' ');
    const duration = raceDuration();

    const players = new Map();
    matchPlayers.forEach((p, idx) => {
      players.set(p.userId, {
        socketId: p.socketId,
        userId: p.userId,
        username: p.username,
        guest: p.guest,
        rating: p.rating,
        caretColor: Theme.caretColors[idx % Theme.caretColors.length],
        cursorPosition: 0,
        correctChars: 0,
        mistakes: 0,
        wpm: 0,
        accuracy: 100,
      });
    });

    const room = {
      roomId,
      words,
      text,
      duration,
      players,
      state: 'countdown', // countdown -> racing -> ended | aborted
      startedAt: null,
      timers: { countdown: null, end: null, idle: null },
    };
    this.rooms.set(roomId, room);

    for (const p of matchPlayers) {
      const socket = this.io.sockets.sockets.get(p.socketId);
      if (socket) {
        socket.join(roomId);
        this.socketRoom.set(p.socketId, roomId);
        socket.data.roomId = roomId;
      }
    }

    this.io.to(roomId).emit(ServerEvents.MATCH_FOUND, {
      roomId,
      words,
      duration,
      players: [...players.values()].map((p) => ({
        userId: p.userId,
        username: p.username,
        rating: p.rating,
        caretColor: p.caretColor,
        guest: p.guest,
      })),
    });

    this.#startCountdown(room);
    this.#armIdleReaper(room);
    logger.info(`Room ${roomId} created (${players.size} players, ${duration}ms)`);
    return room;
  }

  #startCountdown(room) {
    let n = GameConfig.COUNTDOWN_FROM;
    this.io.to(room.roomId).emit(ServerEvents.COUNTDOWN, { value: n });
    room.timers.countdown = setInterval(() => {
      n -= 1;
      if (n > 0) {
        this.io.to(room.roomId).emit(ServerEvents.COUNTDOWN, { value: n });
      } else {
        clearInterval(room.timers.countdown);
        room.timers.countdown = null;
        this.io.to(room.roomId).emit(ServerEvents.COUNTDOWN, { value: 0, go: true });
        this.#startRace(room);
      }
    }, GameConfig.COUNTDOWN_INTERVAL_MS);
  }

  #startRace(room) {
    room.state = 'racing';
    room.startedAt = Date.now();
    this.io.to(room.roomId).emit(ServerEvents.RACE_STARTED, {
      roomId: room.roomId,
      startedAt: room.startedAt,
      duration: room.duration,
    });
    // Authoritative end timer (+buffer so each client's buzzer update lands).
    room.timers.end = setTimeout(
      () => this.#endRace(room),
      room.duration + GameConfig.RACE_END_BUFFER_MS
    );
  }

  /** Relay a typing update to the room and track stats server-side. */
  handleTypingUpdate(socket, payload) {
    const room = this.rooms.get(payload.roomId);
    if (!room || room.state !== 'racing') return;
    const player = room.players.get(payload.userId);
    if (!player || player.socketId !== socket.id) return;

    const len = room.text.length;
    player.cursorPosition = clamp(Math.floor(payload.cursorPosition || 0), 0, len);
    player.correctChars = clamp(Math.floor(payload.correctChars || 0), 0, len);
    player.mistakes = Math.max(0, Math.floor(payload.mistakes || 0));
    player.wpm = clamp(Math.round(payload.wpm || 0), 0, 400);
    player.accuracy = clamp(Math.round((payload.accuracy ?? player.accuracy) * 10) / 10, 0, 100);

    socket.volatile.to(room.roomId).emit(ServerEvents.PLAYER_UPDATE, {
      userId: player.userId,
      cursorPosition: player.cursorPosition,
      wpm: player.wpm,
      correctChars: player.correctChars,
    });
  }

  /**
   * A socket left (disconnect, refresh or explicit). Per spec: if this leaves
   * anyone alone, abort the race immediately and record nothing.
   */
  handleLeave(socketId) {
    const roomId = this.socketRoom.get(socketId);
    this.socketRoom.delete(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room || room.state === 'ended' || room.state === 'aborted') return;

    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    this.#abortRoom(room, player);
  }

  #abortRoom(room, leaver) {
    if (room.state === 'ended' || room.state === 'aborted') return;
    room.state = 'aborted';
    this.#clearTimers(room);
    this.io.to(room.roomId).emit(ServerEvents.OPPONENT_LEFT, {
      userId: leaver?.userId ?? null,
      username: leaver?.username ?? 'opponent',
      aborted: true,
    });
    this.#destroyRoom(room);
    logger.info(`Room ${room.roomId} aborted (player left) — no results recorded`);
  }

  async #endRace(room) {
    if (room.state === 'ended' || room.state === 'aborted') return;
    room.state = 'ended';
    this.#clearTimers(room);

    const players = [...room.players.values()].map((p) => ({
      userId: p.userId,
      username: p.username,
      guest: p.guest,
      rating: p.rating,
      wpm: p.wpm,
      accuracy: p.accuracy,
      correctChars: p.correctChars,
    }));

    let results;
    try {
      const recorded = await recordMatch({
        roomId: room.roomId,
        text: room.text,
        duration: room.duration,
        players,
      });
      results = recorded.results;
    } catch (err) {
      logger.error(`Failed to record match ${room.roomId}:`, err.message);
      results = [...players]
        .sort((a, b) => b.correctChars - a.correctChars)
        .map((p, i) => ({
          userId: p.userId,
          username: p.username,
          placement: i + 1,
          wpm: p.wpm,
          accuracy: p.accuracy,
          correctChars: p.correctChars,
          pointsGained: 0,
          newRating: p.rating,
          guest: p.guest,
        }));
    }

    this.io.to(room.roomId).emit(ServerEvents.RACE_ENDED, { roomId: room.roomId, results });
    this.io.emit(ServerEvents.LEADERBOARD_UPDATE, { at: Date.now() });
    this.#destroyRoom(room);
    logger.info(`Room ${room.roomId} ended`);
  }

  #armIdleReaper(room) {
    room.timers.idle = setTimeout(() => {
      if (this.rooms.has(room.roomId) && room.state !== 'ended') {
        logger.warn(`Reaping idle room ${room.roomId}`);
        this.#destroyRoom(room);
      }
    }, GameConfig.ROOM_IDLE_TTL_MS);
  }

  #clearTimers(room) {
    for (const key of Object.keys(room.timers)) {
      if (room.timers[key]) {
        clearInterval(room.timers[key]);
        clearTimeout(room.timers[key]);
        room.timers[key] = null;
      }
    }
  }

  #destroyRoom(room) {
    this.#clearTimers(room);
    for (const p of room.players.values()) {
      this.socketRoom.delete(p.socketId);
      const socket = this.io.sockets.sockets.get(p.socketId);
      if (socket) {
        socket.leave(room.roomId);
        socket.data.roomId = null;
      }
    }
    this.rooms.delete(room.roomId);
  }

  // True if the socket was in a live room (and we just aborted it). Used by
  // matchmaking to clear a stale room before re-queueing, so nobody gets stuck.
  abortIfInRoom(socketId) {
    const roomId = this.socketRoom.get(socketId);
    if (!roomId) return false;
    const room = this.rooms.get(roomId);
    if (room) {
      const player = [...room.players.values()].find((p) => p.socketId === socketId);
      this.#abortRoom(room, player);
    }
    this.socketRoom.delete(socketId);
    return true;
  }

  stats() {
    return { activeRooms: this.rooms.size };
  }
}
