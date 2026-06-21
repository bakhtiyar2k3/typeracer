import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Requires a valid, non-guest account. Loads the user onto req.user.
export async function requireAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized('Authentication required');

    const payload = verifyToken(token);
    if (payload.guest) throw ApiError.forbidden('Guests cannot access this resource');

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Account no longer exists');

    req.user = user;
    req.auth = payload;
    next();
  } catch (err) {
    if (err.isApiError) return next(err);
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}
