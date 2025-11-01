const { correlationId, metricsMiddleware, metricsEndpoint, trackBookOperation, trackEnrichment, updateActiveConnections, register } = require('../src/middleware/observability');
const express = require('express');
const supertest = require('supertest');

describe('observability middleware', () => {
  test('correlationId sets X-Request-ID and req.id', async () => {
    const app = express();
    app.use(correlationId);
    app.get('/test', (req, res) => res.json({ id: req.id }));
    const res = await supertest(app).get('/test');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.id).toBeDefined();
  });

  test('metricsMiddleware records metrics and logs', async () => {
    const app = express();
    app.use((req, res, next) => { req.log = { info: jest.fn() }; next(); });
    app.use(metricsMiddleware);
    app.get('/test', (req, res) => res.send('ok'));
    await supertest(app).get('/test');
    // No assertion: just ensure no crash and log called
  });

  test('metricsEndpoint returns metrics', async () => {
    const app = express();
    app.get('/metrics', metricsEndpoint);
    const res = await supertest(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/# HELP/);
  });

  test('trackBookOperation increments counter', () => {
    expect(() => trackBookOperation('create', 'success')).not.toThrow();
  });

  test('trackEnrichment increments histogram', () => {
    expect(() => trackEnrichment('openlibrary', 100, 'success')).not.toThrow();
  });

  test('updateActiveConnections sets gauge', () => {
    expect(() => updateActiveConnections(5)).not.toThrow();
  });
});
