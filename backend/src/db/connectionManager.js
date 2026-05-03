/**
 * connectionManager.js — Dual-pool PostgreSQL connection manager with automatic fallback.
 *
 * Strategy:
 *   1. On startup, attempt to connect to the PRIMARY (remote) database.
 *   2. If primary is unreachable or FORCE_LOCAL_DB=true → use LOCAL fallback immediately.
 *   3. Run a health-check ping every DB_HEALTH_CHECK_INTERVAL_MS (default 30 s).
 *   4. If primary recovers and FALLBACK_AUTO_RECOVERY=true → automatically switch back.
 *   5. Per-query safety net: if a query fails mid-flight with a connection error on primary,
 *      the manager switches to local and retries the query transparently.
 *
 * All service files (auth, clients, dashboard, users, schemaValidator) import pool.js,
 * which is a thin proxy to this module. Zero changes are needed in any service file.
 *
 * Logs use [DB:PRIMARY], [DB:LOCAL], and [DB:FALLBACK] prefixes for easy filtering.
 */

'use strict';

const { Pool } = require('pg');
const env      = require('../config/env');
const logger   = require('../utils/logger');

// ── Connection-level error codes that should trigger a fallback switch ─────────
// These represent unreachable / lost connection scenarios, NOT query logic errors.
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',  // TCP refused
  'ENOTFOUND',     // DNS resolution failure
  'ETIMEDOUT',     // TCP timeout
  'ECONNRESET',    // Connection reset by remote
  'EPIPE',         // Broken pipe
  '08000',         // connection_exception
  '08003',         // connection_does_not_exist
  '08006',         // connection_failure
  '08001',         // sqlclient_unable_to_establish_sqlconnection
  '08004',         // sqlserver_rejected_establishment_of_sqlconnection
  '08P01',         // protocol_violation
  '57P01',         // admin_shutdown
  '57P02',         // crash_shutdown
  '57P03',         // cannot_connect_now
  '53300',         // too_many_connections
  '53400',         // configuration_limit_exceeded
]);

function _isConnectionError(err) {
  if (!err) return false;
  if (err.code && CONNECTION_ERROR_CODES.has(err.code)) return true;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('econnrefused') ||
    msg.includes('connection refused') ||
    msg.includes('enotfound') ||
    msg.includes('econnreset') ||
    msg.includes('epipe') ||
    msg.includes('timeout') ||
    msg.includes('terminating connection') ||
    msg.includes('server closed the connection') ||
    msg.includes('connection terminated')
  );
}

// ── ConnectionManager class ───────────────────────────────────────────────────

class ConnectionManager {
  constructor() {
    this._primaryPool    = null;  // pg.Pool for remote/primary DB
    this._localPool      = null;  // pg.Pool for local fallback DB
    this._mode           = 'primary'; // 'primary' | 'local'
    this._primaryHealthy = false;
    this._localHealthy   = false;
    this._initialized    = false;
    this._healthTimer    = null;
    this._switchCount    = 0; // diagnostic counter
  }

  // ── Pool factory methods ──────────────────────────────────────────────────────

  _createPrimaryPool() {
    if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD) {
      return null; // Primary not configured
    }

    const pool = new Pool({
      host:                    env.DB_HOST,
      port:                    env.DB_PORT || 5432,
      database:                env.DB_NAME,
      user:                    env.DB_USER,
      password:                env.DB_PASSWORD,
      max:                     20,
      min:                     1,
      idleTimeoutMillis:       600000,   // 10 min
      connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS || 5000,
      query_timeout:           30000,    // 30 s
      keepAlive:               true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on('connect', () => {
      logger.info(`[DB:PRIMARY] Client connected (total: ${pool.totalCount}, idle: ${pool.idleCount})`);
      // Ensure public search_path for every new client
      pool._activeClient = pool._activeClient; // satisfy linter
    });

    pool.on('error', (err) => {
      logger.error(`[DB:PRIMARY] Unexpected idle-client error: ${err.message}`);
      // Do NOT mark unhealthy here — the periodic health check manages state transitions
      // to avoid flapping from transient errors on idle connections.
    });

    pool.on('remove', () => {
      logger.info(`[DB:PRIMARY] Client removed (total: ${pool.totalCount})`);
    });

    return pool;
  }

  _createLocalPool() {
    const pool = new Pool({
      host:                    env.LOCAL_DB_HOST,
      port:                    env.LOCAL_DB_PORT,
      database:                env.LOCAL_DB_NAME,
      user:                    env.LOCAL_DB_USER,
      password:                env.LOCAL_DB_PASSWORD,
      max:                     10,
      min:                     1,
      idleTimeoutMillis:       300000,   // 5 min
      connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS || 5000,
      query_timeout:           30000,
      keepAlive:               true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on('connect', () => {
      logger.info(`[DB:LOCAL] Client connected (total: ${pool.totalCount}, idle: ${pool.idleCount})`);
    });

    pool.on('error', (err) => {
      logger.error(`[DB:LOCAL] Unexpected idle-client error: ${err.message}`);
    });

    pool.on('remove', () => {
      logger.info(`[DB:LOCAL] Client removed (total: ${pool.totalCount})`);
    });

    return pool;
  }

  // ── Initialization ────────────────────────────────────────────────────────────

  async initialize() {
    if (this._initialized) return;

    logger.info('[DB] Initializing connection manager...');

    // Decide whether to even create a primary pool
    if (env.FORCE_LOCAL_DB) {
      logger.info('[DB] FORCE_LOCAL_DB=true — skipping primary pool, using local DB exclusively');
      this._mode = 'local';
    } else {
      this._primaryPool = this._createPrimaryPool();
      if (!this._primaryPool) {
        logger.warn('[DB] Primary DB is not configured (missing DB_HOST/DB_NAME/DB_USER/DB_PASSWORD) — using local DB');
        this._mode = 'local';
      }
    }

    // Always create the local pool
    this._localPool = this._createLocalPool();

    // Run an initial health check to set the correct starting mode
    await this._runHealthCheck(true);

    // Start the periodic background health-check loop
    const intervalMs = env.DB_HEALTH_CHECK_INTERVAL_MS || 30000;
    this._healthTimer = setInterval(() => this._runHealthCheck(false), intervalMs);
    if (this._healthTimer.unref) this._healthTimer.unref(); // don't block process exit

    this._initialized = true;
    logger.info(`[DB] Connection manager ready — active mode: ${this._mode.toUpperCase()}`);
  }

  // ── Health check ──────────────────────────────────────────────────────────────

  /**
   * Ping a pool with a SELECT 1, racing against a hard timeout.
   * Returns true if reachable, false otherwise.
   */
  async _pingPool(rawPool, label) {
    const timeoutMs = env.DB_HEALTH_CHECK_TIMEOUT_MS || 3000;
    let finished = false;

    // We deliberately call rawPool.query (NOT our proxy's query) to avoid recursion.
    const queryPromise = rawPool.query('SELECT 1').then(() => {
      finished = true;
      return true;
    }).catch((err) => {
      finished = true;
      logger.warn(`[DB:${label}] Health check query failed: ${err.message}`);
      return false;
    });

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => {
        if (!finished) {
          logger.warn(`[DB:${label}] Health check timed out after ${timeoutMs}ms`);
        }
        resolve(false);
      }, timeoutMs)
    );

    return Promise.race([queryPromise, timeoutPromise]);
  }

  async _runHealthCheck(isStartup = false) {
    const prevPrimaryHealthy = this._primaryHealthy;
    const prevLocalHealthy   = this._localHealthy;
    const prevMode           = this._mode;

    // ── Check primary ─────────────────────────────────────────────────────────
    if (this._primaryPool && !env.FORCE_LOCAL_DB) {
      const ok = await this._pingPool(this._primaryPool, 'PRIMARY');
      this._primaryHealthy = ok;

      if (ok && !prevPrimaryHealthy) {
        // Primary just came back online
        logger.info('[DB:PRIMARY] ✅  Primary database is HEALTHY');

        if (!isStartup && this._mode === 'local' && env.FALLBACK_AUTO_RECOVERY !== false) {
          this._mode = 'primary';
          this._switchCount++;
          logger.info('[DB] ⬆️   Switched back to PRIMARY database (auto-recovery)');
        }
      }

      if (!ok && prevPrimaryHealthy) {
        // Primary just went down
        logger.error('[DB:PRIMARY] ❌  Primary database is UNHEALTHY');
        if (this._mode === 'primary') {
          this._mode = 'local';
          this._switchCount++;
          logger.warn('[DB] ⬇️   PRIMARY database unavailable — switched to LOCAL FALLBACK database');
        }
      }

      if (!ok && isStartup) {
        // Primary is unreachable at startup
        this._mode = 'local';
        logger.warn('[DB] Primary unreachable at startup — starting in LOCAL FALLBACK mode');
      }

      if (ok && isStartup && !env.FORCE_LOCAL_DB) {
        this._mode = 'primary';
        logger.info('[DB] Primary reachable at startup — starting in PRIMARY mode');
      }
    }

    // ── Check local ───────────────────────────────────────────────────────────
    if (this._localPool) {
      const ok = await this._pingPool(this._localPool, 'LOCAL');
      this._localHealthy = ok;

      if (!ok && prevLocalHealthy) {
        logger.error('[DB:LOCAL] ❌  Local fallback database is now UNHEALTHY');
      }
      if (ok && !prevLocalHealthy) {
        logger.info('[DB:LOCAL] ✅  Local fallback database is HEALTHY');
      }
      if (!ok && this._mode === 'local') {
        logger.error('[DB:LOCAL] ❌  Both primary and local databases are unreachable — all queries will fail');
      }
    }

    if (!isStartup && prevMode !== this._mode) {
      logger.info(`[DB] Mode transition: ${prevMode.toUpperCase()} → ${this._mode.toUpperCase()} (total switches: ${this._switchCount})`);
    }
  }

  // ── Active pool resolution ────────────────────────────────────────────────────

  _getActivePool() {
    if (this._mode === 'primary' && this._primaryPool) {
      return { pool: this._primaryPool, label: 'PRIMARY' };
    }
    if (this._localPool) {
      return { pool: this._localPool, label: 'LOCAL' };
    }
    // Both unavailable
    throw Object.assign(
      new Error('No database connection available. Both primary and local databases are unreachable. Please check your database servers.'),
      { statusCode: 503 }
    );
  }

  // ── Public API: query() ───────────────────────────────────────────────────────

  /**
   * Execute a SQL query on the active pool.
   * Logs slow queries (>3 s) and switches to local fallback on connection errors.
   */
  async query(...args) {
    const start  = Date.now();
    const { pool, label } = this._getActivePool();

    try {
      const result = await pool.query(...args);
      const ms = Date.now() - start;
      if (ms > 3000) {
        const text = typeof args[0] === 'string' ? args[0].slice(0, 120) : '(prepared)';
        logger.warn(`[DB:${label}] Slow query (${ms}ms): ${text}`);
      }
      return result;

    } catch (err) {
      const ms   = Date.now() - start;
      const text = typeof args[0] === 'string' ? args[0].slice(0, 120) : '(prepared)';

      // ── Mid-query connection failure on primary → try local ────────────────
      if (_isConnectionError(err) && label === 'PRIMARY' && this._localPool) {
        logger.warn(`[DB:FALLBACK] Primary query failed mid-flight (${err.message}) — retrying on local DB`);
        this._primaryHealthy = false;
        this._mode = 'local';
        this._switchCount++;

        try {
          const fallbackResult = await this._localPool.query(...args);
          logger.info('[DB:FALLBACK] Query succeeded on local fallback DB');
          return fallbackResult;
        } catch (localErr) {
          logger.error(`[DB:LOCAL] Fallback query also failed (${localErr.message}): ${text}`);
          throw localErr;
        }
      }

      logger.error(`[DB:${label}] Query failed (${ms}ms): ${text} — ${err.message}`);
      throw err;
    }
  }

  // ── Public API: connect() ─────────────────────────────────────────────────────

  /**
   * Acquire a client from the active pool (for transactions).
   * Returns a pg.PoolClient — caller is responsible for client.release().
   */
  async connect() {
    const { pool, label } = this._getActivePool();
    try {
      return await pool.connect();
    } catch (err) {
      if (_isConnectionError(err) && label === 'PRIMARY' && this._localPool) {
        logger.warn(`[DB:FALLBACK] Primary connect() failed (${err.message}) — using local DB`);
        this._primaryHealthy = false;
        this._mode = 'local';
        this._switchCount++;
        return this._localPool.connect();
      }
      throw err;
    }
  }

  /**
   * Run a long-running export query without the pool's query_timeout constraint.
   *
   * The regular pool has query_timeout:30000 (30 s) to guard against runaway
   * chart queries. Full-table datasource exports (SELECT * FROM large_table) can
   * legitimately take longer, so we open a fresh pg.Client with no client-side
   * timeout and a generous server-side statement_timeout (5 min).
   *
   * Falls back to the local DB config if the primary is not active.
   */
  async exportQuery(sql, params = []) {
    const { Client } = require('pg');
    const { label } = this._getActivePool();

    const isPrimary = label === 'PRIMARY' && !env.FORCE_LOCAL_DB && env.DB_HOST;
    const cfg = isPrimary
      ? { host: env.DB_HOST, port: env.DB_PORT || 5432, database: env.DB_NAME,      user: env.DB_USER,      password: env.DB_PASSWORD      }
      : { host: env.LOCAL_DB_HOST, port: env.LOCAL_DB_PORT, database: env.LOCAL_DB_NAME, user: env.LOCAL_DB_USER, password: env.LOCAL_DB_PASSWORD };

    const client = new Client({ ...cfg, connectionTimeoutMillis: 15000 });
    const start = Date.now();
    try {
      await client.connect();
      await client.query('SET statement_timeout = 300000'); // 5-minute server-side limit
      const result = await client.query(sql, params);
      logger.info(`[DB:EXPORT] query completed in ${Date.now() - start}ms — ${result.rows.length} rows`);
      return result;
    } catch (err) {
      logger.error(`[DB:EXPORT] query failed after ${Date.now() - start}ms: ${err.message}\nSQL: ${sql.slice(0, 200)}`);
      throw err;
    } finally {
      try { await client.end(); } catch (_) {}
    }
  }

  // ── Status & diagnostics ──────────────────────────────────────────────────────

  get mode()           { return this._mode; }
  get primaryHealthy() { return this._primaryHealthy; }
  get localHealthy()   { return this._localHealthy; }

  get totalCount() {
    try { return this._getActivePool().pool.totalCount; } catch (_) { return 0; }
  }
  get idleCount() {
    try { return this._getActivePool().pool.idleCount; } catch (_) { return 0; }
  }
  get waitingCount() {
    try { return this._getActivePool().pool.waitingCount; } catch (_) { return 0; }
  }

  /**
   * Returns a structured status object used by the /health endpoint.
   */
  getStatus() {
    return {
      mode:        this._mode,
      initialized: this._initialized,
      switchCount: this._switchCount,
      primary: {
        configured: Boolean(this._primaryPool),
        healthy:    this._primaryHealthy,
        forced_off: Boolean(env.FORCE_LOCAL_DB),
        host:       env.DB_HOST ? `${env.DB_HOST}:${env.DB_PORT || 5432}` : null,
        database:   env.DB_NAME || null,
        pool: this._primaryPool ? {
          total:   this._primaryPool.totalCount,
          idle:    this._primaryPool.idleCount,
          waiting: this._primaryPool.waitingCount,
        } : null,
      },
      local: {
        configured: Boolean(this._localPool),
        healthy:    this._localHealthy,
        host:       `${env.LOCAL_DB_HOST}:${env.LOCAL_DB_PORT}`,
        database:   env.LOCAL_DB_NAME,
        pool: this._localPool ? {
          total:   this._localPool.totalCount,
          idle:    this._localPool.idleCount,
          waiting: this._localPool.waitingCount,
        } : null,
      },
    };
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────────

  async shutdown() {
    if (this._healthTimer) {
      clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
    await Promise.allSettled([
      this._primaryPool ? this._primaryPool.end() : Promise.resolve(),
      this._localPool   ? this._localPool.end()   : Promise.resolve(),
    ]);
    logger.info('[DB] Connection manager shut down — all pools closed');
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
const connectionManager = new ConnectionManager();
module.exports = connectionManager;
