import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

async function start() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);

  // Expose live socket stats on the health route.
  app.get('/api/realtime', (_req, res) => res.json(io.getStats()));

  httpServer.listen(env.port, () => {
    logger.info(`TypeRacer server listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    logger.warn(`${signal} received — shutting down gracefully`);
    io.close();
    httpServer.close();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason));
}

start().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
