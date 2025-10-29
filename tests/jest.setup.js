// Jest setup: ensure database pool is closed to prevent open handle warnings
const pool = require('../src/config/database');

afterAll(async () => {
  if (pool && typeof pool.end === 'function') {
    await pool.end().catch(() => {});
  }
});
