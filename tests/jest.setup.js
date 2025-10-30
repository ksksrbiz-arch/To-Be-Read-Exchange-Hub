// Jest setup: ensure database pool is closed to prevent open handle warnings
const pool = require('../src/config/database');

afterAll(async () => {
  if (pool && typeof pool.end === 'function') {
    await pool.end().catch(() => {});
  }
});

// Global test setup - suppress console output in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock ESM-only uuid package to avoid Jest CommonJS parsing issues
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(16).slice(2),
}));

// Mock pg Pool to avoid real DB dependency in health db test
jest.mock('../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  end: jest.fn().mockResolvedValue(),
}));


// Removed mock for gracefulShutdown to allow real implementation tests to run in CI.
// process.exit guarded inside implementation when NODE_ENV==='test'.
