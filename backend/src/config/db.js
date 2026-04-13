/**
 * db.js — PostgreSQL connection pool configuration.
 * Re-exports the singleton pool from db/pool.js.
 */

const pool = require('../db/pool');
module.exports = pool;
