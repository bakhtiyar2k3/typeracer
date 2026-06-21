import { io } from 'socket.io-client';
import { SERVER_URL } from '../services/config.js';

// Single shared Socket.io connection for the whole app. Reconnects with the
// current auth token; callers connect lazily right before queueing.
let socket = null;

export function connectSocket(token) {
  if (socket) {
    // Update the auth token and reconnect if it changed (e.g. guest -> user).
    if (socket.auth?.token !== token) {
      socket.auth = { token };
      if (!socket.connected) socket.connect();
    }
    return socket;
  }

  // Empty SERVER_URL (production) -> undefined -> Socket.io uses the page origin.
  socket = io(SERVER_URL || undefined, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 800,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
