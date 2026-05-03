/**
 * pool.js — Transparent proxy to the ConnectionManager.
 *
 * All service files (auth, clients, dashboard, users, schemaValidator) and
 * config/db.js import this module via:
 *   const pool = require('../db/pool');      // or
 *   const pool = require('../config/db');
 *
 * This proxy maintains the exact same pg.Pool surface API those files rely on,
 * while the real dual-pool logic (primary ↔ local fallback) lives in
 * connectionManager.js. ZERO changes are required in any service or utility file.
 *
 * Exposed API (matching pg.Pool usage across the codebase):
 *   pool.query(text, params?)  — execute a query on the active pool (with fallback)
 *   pool.connect()             — acquire a client for transactions
 *   pool.totalCount            — active pool stat
 *   pool.idleCount             — active pool stat
 *   pool.waitingCount          — active pool stat
 *   pool.on(event, handler)    — no-op (events handled internally by connectionManager)
 *
 * Additional helpers exposed for server.js:
 *   pool.mode                  — 'primary' | 'local'
 *   pool.getStatus()           — full dual-pool status object (used by /health)
 */

'use strict';

const connectionManager = require('./connectionManager');

const pool = {
  // ── Core database operations ─────────────────────────────────────────────────

  /**
   * Execute a SQL query. Routes to the active pool (primary or local).
   * On mid-query connection failure on primary, automatically retries on local.
   */
  query: (...args) => connectionManager.query(...args),

  /**
   * Acquire a raw pg.PoolClient for use in explicit transactions.
   * Always call client.release() in a finally block.
   */
  connect: (...args) => connectionManager.connect(...args),

  /**
   * Long-running export query — bypasses the pool's 30 s query_timeout.
   * Use exclusively in getFullSourceTable() implementations.
   * Opens a fresh pg.Client with no client-side timeout and a 5-minute
   * server-side statement_timeout, then closes it after the query.
   */
  exportQuery: (...args) => connectionManager.exportQuery(...args),

  /**
   * Pool event registration — no-op here because both pools manage their own
   * events inside connectionManager. Legacy callers that do pool.on('error', ...)
   * are safe; the call is silently swallowed.
   */
  on: () => {},

  // ── Pool statistics (read from whichever pool is currently active) ───────────

  get totalCount()   { return connectionManager.totalCount; },
  get idleCount()    { return connectionManager.idleCount; },
  get waitingCount() { return connectionManager.waitingCount; },

  // ── Mode & diagnostics ───────────────────────────────────────────────────────

  /** Current active mode: 'primary' or 'local' */
  get mode() { return connectionManager.mode; },

  /** Full structured status used by the /health endpoint in server.js */
  getStatus: () => connectionManager.getStatus(),
};

module.exports = pool;
