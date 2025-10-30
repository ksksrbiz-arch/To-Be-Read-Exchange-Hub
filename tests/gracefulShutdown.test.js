const express = require('express');
// Use real implementation (jest.setup globally mocks; override here)
jest.unmock('../src/utils/gracefulShutdown');
const GracefulShutdown = jest.requireActual('../src/utils/gracefulShutdown');

describe('GracefulShutdown', () => {
  test('healthCheckMiddleware integration 503 when shutting down', async () => {
    const fakeServer = { on: () => {}, close: (cb) => cb && cb() };
    const fakePool = { end: jest.fn().mockResolvedValue() };
    const gs = new GracefulShutdown(fakeServer, fakePool);
    gs.shuttingDown = true; // simulate in-progress shutdown
    const app = express();
    app.get('/health-mw', gs.healthCheckMiddleware(), (req, res) => res.json({ ok: true }));
    const res = await require('supertest')(app).get('/health-mw');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('shutting_down');
  });

  test('healthCheckMiddleware integration passes through when not shutting down', async () => {
    const fakeServer = { on: () => {}, close: (cb) => cb && cb() };
    const fakePool = { end: jest.fn().mockResolvedValue() };
    const gs = new GracefulShutdown(fakeServer, fakePool);
    gs.shuttingDown = false;
    const app = express();
    app.get('/health-mw', gs.healthCheckMiddleware(), (req, res) => res.json({ ok: true }));
    const res = await require('supertest')(app).get('/health-mw');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('shutdown executes all steps', async () => {
    // Capture connection handler
    const handlers = {};
    const fakeServer = {
      on: (evt, cb) => { handlers[evt] = cb; },
      close: (cb) => cb && cb(),
      keepAliveTimeout: 0,
      headersTimeout: 0,
    };
    const fakePool = { end: jest.fn().mockResolvedValue() };
    const gs = new GracefulShutdown(fakeServer, fakePool, { timeout: 200 });
    // Simulate two connections
    const mkConn = () => ({ destroyed: false, end: jest.fn(), destroy: jest.fn(), on: jest.fn((e, cb)=>{ if(e==='close'){ /* allow manual close */ } }) });
    const c1 = mkConn();
    const c2 = mkConn();
    handlers.connection && handlers.connection(c1);
    handlers.connection && handlers.connection(c2);
    await gs.shutdown();
    expect(fakePool.end).toHaveBeenCalled();
    expect(c1.end).toHaveBeenCalled();
    expect(c2.end).toHaveBeenCalled();
    // After destroy step
    expect(c1.destroy).toHaveBeenCalled();
    expect(c2.destroy).toHaveBeenCalled();
  });
});
