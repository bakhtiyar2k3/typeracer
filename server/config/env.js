import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const DEV_JWT_SECRET = 'dev-insecure-secret-change-me';

// In production every secret must be supplied explicitly; in development we fall
// back to safe local defaults so the app runs with zero config.
function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Missing required environment variable in production: ${name}`);
  return devFallback;
}

const jwtSecret = required('JWT_SECRET', DEV_JWT_SECRET);
if (isProd && jwtSecret === DEV_JWT_SECRET) {
  throw new Error('JWT_SECRET must be set to a strong, unique value in production');
}

export const env = Object.freeze({
  port: Number(process.env.PORT || 4000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/typeracer'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isProd,
});
