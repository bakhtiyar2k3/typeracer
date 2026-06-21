import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// 404 for unmatched routes.
export function notFound(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

// Central error handler. Normalizes ApiError, Mongo duplicate keys and
// unexpected errors into a consistent JSON shape.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.isApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `${field} already exists` });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(env.isProd ? {} : { detail: err.message }),
  });
}
