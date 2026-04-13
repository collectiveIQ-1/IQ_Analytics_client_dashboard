/**
 * pool.js — Singleton pg connection pool.
 * Import this wherever you need to query the database.
 */

const { Pool } = require('pg');
const env      = require('../config/env');
const logger   = require('../utils/logger');

const pool = new Pool({
  host:     env.DB_HOST,
  port:     env.DB_PORT,
  database: env.DB_NAME,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,
  max:      20,               // max connections in pool
  idleTimeoutMillis:  30000,  // close idle clients after 30s
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('PostgreSQL client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
