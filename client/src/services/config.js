// Origin for the Socket.io connection.
// - dev: connect directly to the API server on :4000 (Vite serves the SPA).
// - prod: same-origin ('' -> the page's own host), where a reverse proxy (nginx)
//   forwards /api and /socket.io to the backend. No build-time host needed.
// Override either with VITE_SERVER_URL.
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:4000');
