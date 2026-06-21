import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Builds the Express application (kept separate from the HTTP/socket bootstrap
// so it can be imported in tests without binding a port).
export function createApp() {
  const app = express();

  // Token-based auth (no cookies), so no credentials needed in CORS.
  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json({ limit: '64kb' }));
  app.use('/api', apiLimiter, apiRoutes);

  // Single-service deploy: serve the built SPA from the same origin as the API
  // and sockets. In the docker-compose setup nginx does this instead, and the
  // directory is absent, so this block is skipped.
  if (env.clientDir && fs.existsSync(path.join(env.clientDir, 'index.html'))) {
    app.use(express.static(env.clientDir));
    // Client-side routing: send index.html for any non-API GET.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(env.clientDir, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
