import { ServerEvents } from '../../shared/constants/socketEvents.js';
import { GameConfig } from '../../shared/constants/game.js';
import { logger } from '../utils/logger.js';

/**
 * In-memory matchmaking queue. When enough players are waiting it pops a group
 * and hands them to the RaceManager to start a room. Entries are keyed by
 * socketId so a disconnect can remove a waiting player instantly.
 */
export class Matchmaking {
  constructor(io, raceManager) {
    this.io = io;
    this.raceManager = raceManager;
    /** @type {Map<string, any>} socketId -> queued player */
    this.queue = new Map();
    /** @type {Map<string, NodeJS.Timeout>} socketId -> queue timeout */
    this.timeouts = new Map();
  }

  /** Add a player to the queue (idempotent per socket). */
  join(socket, player) {
    if (this.queue.has(socket.id)) return;

    // If this socket is somehow still tied to a live room (e.g. a quick
    // reconnect), abort that room first so its opponent is freed and nobody is
    // left stuck either in a dead race or waiting forever.
    this.raceManager.abortIfInRoom(socket.id);

    this.queue.set(socket.id, { socketId: socket.id, ...player });
    socket.emit(ServerEvents.QUEUE_JOINED, { position: this.queue.size });

    // Auto-expire a waiting player so the queue never holds stale entries.
    const timer = setTimeout(() => {
      if (this.queue.has(socket.id)) {
        this.leave(socket.id);
        socket.emit(ServerEvents.ERROR, {
          code: 'QUEUE_TIMEOUT',
          message: 'No opponent found. Please try again.',
        });
      }
    }, GameConfig.QUEUE_TIMEOUT_MS);
    this.timeouts.set(socket.id, timer);

    logger.info(`${player.username} joined queue (size ${this.queue.size})`);
    this.#tryMatch();
  }

  /** Remove a player from the queue (explicit leave or disconnect). */
  leave(socketId) {
    const existed = this.queue.delete(socketId);
    const timer = this.timeouts.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(socketId);
    }
    return existed;
  }

  #tryMatch() {
    while (this.queue.size >= GameConfig.PLAYERS_PER_MATCH) {
      const group = [...this.queue.values()].slice(0, GameConfig.PLAYERS_PER_MATCH);
      // Reserve these players: clear their queue entries and timers first so a
      // racing player can never be double-matched.
      for (const p of group) this.leave(p.socketId);

      // Verify all sockets are still connected before committing the room.
      const live = group.filter((p) => this.io.sockets.sockets.has(p.socketId));
      if (live.length < GameConfig.PLAYERS_PER_MATCH) {
        // Someone vanished — requeue the survivors and stop (avoid busy loop).
        for (const p of live) {
          const socket = this.io.sockets.sockets.get(p.socketId);
          if (socket) this.join(socket, p);
        }
        break;
      }

      this.raceManager.createRoom(live);
    }
  }

  stats() {
    return { queued: this.queue.size };
  }
}
