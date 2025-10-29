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

// Mock enterprise middleware to prevent initialization issues in tests
jest.mock('../src/middleware/observability', () => ({
  correlationId: (req, res, next) => {
    req.id = 'test-request-id';
    req.log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    next();
  },
  metricsMiddleware: (req, res, next) => next(),
  metricsEndpoint: (req, res) => res.end('# HELP test metrics'),
  trackBookOperation: jest.fn(),
  trackEnrichment: jest.fn(),
  updateActiveConnections: jest.fn(),
}));

jest.mock('../src/middleware/security', () => ({
  securityHeaders: (req, res, next) => next(),
  sanitizeInput: (req, res, next) => next(),
  apiKeyAuth: (req, res, next) => next(),
}));

jest.mock('../src/utils/featureFlags', () => ({
  middleware: () => (req, res, next) => {
    req.features = {
      isEnabled: jest.fn().mockReturnValue(true),
      getAll: jest.fn().mockReturnValue({}),
    };
    next();
  },
  getAllFlags: jest.fn().mockReturnValue({}),
  isEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../src/utils/sloMonitor', () => ({
  sloMonitor: {
    recordRequest: jest.fn(),
    getStatus: jest.fn().mockReturnValue({
      availability: { current: '99.95', target: 99.9, status: 'met' },
      latency: { p95: '100', p99: '500', status: 'met' },
    }),
  },
}));

jest.mock('../src/utils/gracefulShutdown', () => {
  return jest.fn().mockImplementation(() => ({
    healthCheckMiddleware: () => (req, res, next) => next(),
    isShuttingDown: () => false,
  }));
});
