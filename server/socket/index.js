import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { RatingConfig } from '../../shared/constants/game.js';
import { ClientEvents, ServerEvents } from '../../shared/constants/socketEvents.js';
import { RaceManager } from './raceManager.js';
import { Matchmaking } from './matchmaking.js';
import { logger } from '../utils/logger.js';

// Verifies the JWT supplied in the socket handshake and attaches identity to
// socket.data. Connections without a valid token (guest or user) are rejected.
async function authMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = verifyToken(token);
    socket.data.user = {
      userId: payload.sub,
      username: payload.username,
      guest: Boolean(payload.guest),
    };
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

// Snapshot a player's current rating at queue time (guests are always 1000).
async function resolveRating(user) {
  if (user.guest) return RatingConfig.START_RATING;
  const doc = await User.findById(user.userId).select('rating');
  return doc?.rating ?? RatingConfig.START_RATING;
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    // Token-based handshake auth (no cookies), so no credentials needed.
    cors: { origin: env.clientOrigin },
    // Throttle/clean transport; updates use volatile emits for caret frames.
    pingInterval: 20000,
    pingTimeout: 25000,
  });

  const raceManager = new RaceManager(io);
  const matchmaking = new Matchmaking(io, raceManager);

  io.use(authMiddleware);

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.data.roomId = null;
    logger.debug(`Socket connected: ${socket.id} (${user.username})`);

    socket.on(ClientEvents.JOIN_QUEUE, async () => {
      try {
        const rating = await resolveRating(user);
        matchmaking.join(socket, {
          userId: user.userId,
          username: user.username,
          guest: user.guest,
          rating,
        });
      } catch (err) {
        logger.error('joinQueue error:', err.message);
        socket.emit(ServerEvents.ERROR, { code: 'QUEUE_FAILED', message: 'Could not join queue' });
      }
    });

    socket.on(ClientEvents.LEAVE_QUEUE, () => {
      matchmaking.leave(socket.id);
    });

    socket.on(ClientEvents.TYPING_UPDATE, (payload) => {
      // Identity is enforced: a socket can only move its own caret.
      if (!payload || payload.userId !== user.userId) return;
      raceManager.handleTypingUpdate(socket, payload);
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
      matchmaking.leave(socket.id);
      raceManager.handleLeave(socket.id);
    });
  });

  // Expose lightweight stats for the health endpoint / debugging.
  io.getStats = () => ({ ...matchmaking.stats(), ...raceManager.stats() });

  logger.info('Socket.io initialized');
  return io;
}
