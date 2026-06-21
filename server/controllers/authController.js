import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';

function issueUserToken(user) {
  return signToken({ sub: user._id.toString(), username: user.username, guest: false });
}

export const register = asyncHandler(async (req, res) => {
  const { username, email, password, country } = req.body;
  const usernameLower = username.toLowerCase();

  const existing = await User.findOne({
    $or: [{ usernameLower }, { email }],
  });
  if (existing) {
    const field = existing.email === email ? 'Email' : 'Username';
    throw ApiError.conflict(`${field} is already taken`);
  }

  const user = await User.create({ username, usernameLower, email, password, country });
  const token = issueUserToken(user);

  res.status(201).json({ token, user: user.toPublicJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const lookup = identifier.includes('@')
    ? { email: identifier.toLowerCase() }
    : { usernameLower: identifier.toLowerCase() };

  // Must explicitly select the hidden password field for comparison.
  const user = await User.findOne(lookup).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const token = issueUserToken(user);
  res.json({ token, user: user.toPublicJSON() });
});

// Guest mode: short-lived identity, never persisted, cannot rank or appear on
// leaderboards. The token carries guest: true so requireAuth rejects it.
export const guest = asyncHandler(async (req, res) => {
  const base = (req.body.username || 'guest').replace(/\s+/g, '_').slice(0, 16);
  const suffix = crypto.randomBytes(2).toString('hex');
  const username = `${base}_${suffix}`;
  const guestId = `guest_${crypto.randomUUID()}`;

  const token = signToken({ sub: guestId, username, guest: true });
  res.json({
    token,
    user: { id: guestId, username, guest: true, rating: 1000, avatar: '', country: '' },
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});
