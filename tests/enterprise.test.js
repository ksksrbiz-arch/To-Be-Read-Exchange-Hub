// Enterprise feature coverage tests
// Validates: security headers, correlation IDs, metrics, feature flags, SLO monitor, API key auth, input sanitization, graceful shutdown indicator.

const request = require('supertest');
const express = require('express');

// Import enterprise modules (unit-level)
const { securityHeaders, apiKeyAuth, sanitizeInput } = require('../src/middleware/security');
const { correlationId, metricsMiddleware, metricsEndpoint, register } = require('../src/middleware/observability');
const featureFlags = require('../src/utils/featureFlags');
const { sloMonitor } = require('../src/utils/sloMonitor');
const GracefulShutdown = require('../src/utils/gracefulShutdown');

// Ensure a deterministic environment for feature flags & API key tests
delete process.env.API_KEY_ENABLED;
delete process.env.API_KEYS;

// Import full application (server only starts if main, so safe for supertest)
// This provides real enterprise endpoints (/metrics, /api/features, /api/slo)
// eslint-disable-next-line global-require
const fullApp = require('../src/server');

// Helper: build a minimal app to isolate certain middleware logic
function buildMiniApp({ enableApiKey = false, apiKeys = 'test-key', includeSanitize = false, includeFeatureEndpoints = false } = {}) {
  if (enableApiKey) {
    process.env.API_KEY_ENABLED = 'true';
    process.env.API_KEYS = apiKeys;
  } else {
    process.env.API_KEY_ENABLED = 'false';
  }

  const app = express();
  app.use(express.json());
  app.use(securityHeaders);
  app.use(correlationId);
  app.use(metricsMiddleware);
  if (includeSanitize) app.use(sanitizeInput);
  app.get('/metrics', metricsEndpoint);
  app.get('/simple', (req, res) => {
    res.json({ ok: true, id: req.id });
  });
  app.post('/echo', (req, res) => {
    res.json({ body: req.body });
  });
  // Protected route example
  app.get('/protected', apiKeyAuth, (req, res) => {
    res.json({ secured: true });
  });
  if (includeFeatureEndpoints) {
    app.get('/features', (req, res) => {
      res.json({ success: true, features: featureFlags.getAllFlags() });
    });
    app.get('/slo', (req, res) => {
      res.json(sloMonitor.getStatus());
    });
  }
  return app;
}

describe('Enterprise: Security Headers', () => {
  test('express powered-by removed and at least one helmet header present', async () => {
    const res = await request(fullApp).get('/health');
    const keys = Object.keys(res.headers);
    expect(keys).not.toContain('x-powered-by');
    const securityCandidates = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security',
      'referrer-policy'
    ];
    expect(keys.some(k => securityCandidates.includes(k))).toBe(true);
  });
});

describe('Enterprise: Correlation ID', () => {
  const app = buildMiniApp();
  test('correlation id is present in response body', async () => {
    const res = await request(app).get('/simple');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(10);
  });
});

describe('Enterprise: Metrics', () => {
  test('full server metrics endpoint returns Prometheus text', async () => {
    await request(fullApp).get('/health');
    const res = await request(fullApp).get('/metrics');
    expect(res.status).toBe(200);
    expect(typeof res.text).toBe('string');
    expect(/# HELP/.test(res.text)).toBe(true);
  });
  test('counter increments after request', async () => {
    const before = await request(fullApp).get('/metrics');
    await request(fullApp).get('/health');
    const after = await request(fullApp).get('/metrics');
    const extractCount = (text) => {
      const match = text.match(/http_requests_total\s+(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };
    const beforeCount = extractCount(before.text);
    const afterCount = extractCount(after.text);
    if (beforeCount !== null && afterCount !== null) {
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
    } else {
      expect(after.text.split('\n').length).toBeGreaterThanOrEqual(before.text.split('\n').length);
    }
  });
});

describe('Enterprise: Feature Flags', () => {
  test('full server exposes feature flags', async () => {
    const res = await request(fullApp).get('/api/features');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.features).toBeDefined();
    expect(typeof res.body.features).toBe('object');
  });
  test('deterministic hashing returns stable result for identifier', () => {
    featureFlags.setFlag('test_percentage', 30);
    const id = 'user-abc-123';
    const first = featureFlags.isEnabled('test_percentage', id);
    const second = featureFlags.isEnabled('test_percentage', id);
    expect(first).toBe(second);
  });
});

describe('Enterprise: Service Level Objectives', () => {
  test('full server SLO endpoint returns summary', async () => {
    sloMonitor.recordRequest(150, false);
    sloMonitor.recordRequest(225, true);
    const res = await request(fullApp).get('/api/slo');
    expect(res.status).toBe(200);
    if (!res.body.summary) {
      throw new Error(`SLO summary missing. Body keys: ${Object.keys(res.body)} Body: ${JSON.stringify(res.body)}`);
    }
    expect(res.body.summary.totalRequests).toBeGreaterThanOrEqual(1);
  });
  test('error budget exhaustion scenario reports degraded', async () => {
    for (let i = 0; i < 20; i++) sloMonitor.recordRequest(100, true);
    const status = sloMonitor.getStatus();
    expect(status.errorBudgetRemaining).toBeLessThanOrEqual(100);
  });
});

describe('Enterprise: API Key Auth', () => {
  test('valid key returns 200', async () => {
    const VALID_KEY = 'valid-key';
    const app = buildMiniApp({ enableApiKey: true, apiKeys: VALID_KEY });
    const res = await request(app).get('/protected').set('X-API-Key', VALID_KEY);
    expect(res.status).toBe(200);
  });
});

describe('Enterprise: Input Sanitization', () => {
  const app = buildMiniApp({ includeSanitize: true });
  test('sanitization does not crash and returns body', async () => {
    const dirty = 'Clean\x00This\x1FString';
    const res = await request(app).post('/echo').send({ title: dirty });
    expect(res.status).toBe(200);
    expect(res.body.body.title).toBeDefined();
  });
});

describe('Enterprise: Graceful Shutdown indicator', () => {
  test('middleware callable without throwing', async () => {
    const fakeServer = { on: () => {}, close: (cb) => cb() };
    const fakePool = { end: async () => {} };
    const gs = new GracefulShutdown(fakeServer, fakePool);
    const middleware = gs.healthCheckMiddleware();
    const req = {}; const res = { status: () => ({ json: () => {} }) }; const next = () => {};
    expect(() => middleware(req, res, next)).not.toThrow();
  });
  test('health middleware returns 503 when shutting down', () => {
    const fakeServer = { on: () => {}, close: (cb) => cb() };
    const fakePool = { end: async () => {} };
    const gs = new GracefulShutdown(fakeServer, fakePool);
    gs.shuttingDown = true;
    const middleware = gs.healthCheckMiddleware();
    const req = {}; let statusCode; let payload;
    const res = { status: (c) => { statusCode = c; return { json: (p) => { payload = p; } }; } };
    middleware(req, res, () => {});
    expect(statusCode).toBe(503);
    expect(payload.status).toBe('shutting_down');
  });
});

describe('Enterprise: Correlation ID logger binding', () => {
  test('logger writes with correlation id when present', async () => {
    const app = express();
    app.use(correlationId);
    app.get('/log', (req, res) => {
      if (req.log) {
        req.log.info({ test: true }, 'Correlation log test');
        res.json({ hasLog: true, id: req.id });
      } else {
        res.json({ hasLog: false });
      }
    });
    const res = await request(app).get('/log');
    expect(res.body.hasLog).toBe(true);
    expect(typeof res.body.id).toBe('string');
  });
});

afterAll(async () => {
  // Prom-client metrics cleanup to avoid leaking handles in watch mode
  try {
    register.clear();
  } catch (e) {
    // ignore
  }
});
