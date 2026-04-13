/**
 * env.js — Validates and exports all environment variables.
 * The app will crash on startup if a required variable is missing.
 */

const required = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_SECRET',
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

module.exports = {
  NODE_ENV:      process.env.NODE_ENV      || 'development',
  PORT:          parseInt(process.env.PORT, 10) || 4000,
  FRONTEND_URL:  process.env.FRONTEND_URL  || 'http://localhost:5173',

  DB_HOST:       process.env.DB_HOST,
  DB_PORT:       parseInt(process.env.DB_PORT, 10),
  DB_NAME:       process.env.DB_NAME,
  DB_USER:       process.env.DB_USER,
  DB_PASSWORD:   process.env.DB_PASSWORD,

  JWT_SECRET:    process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
};
