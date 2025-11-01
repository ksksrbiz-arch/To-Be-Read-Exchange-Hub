const { securityHeaders, apiKeyAuth, sanitizeInput } = require('../src/middleware/security');
const express = require('express');

describe('security middleware', () => {
  test('securityHeaders sets helmet headers', async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/test', (req, res) => res.send('ok'));
    const res = await require('supertest')(app).get('/test');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  test('apiKeyAuth allows when disabled', async () => {
    process.env.API_KEY_ENABLED = 'false';
    const app = express();
    app.use(apiKeyAuth);
    app.get('/test', (req, res) => res.send('ok'));
    const res = await require('supertest')(app).get('/test');
    expect(res.status).toBe(200);
  });

  test('apiKeyAuth blocks missing key', async () => {
    process.env.API_KEY_ENABLED = 'true';
    process.env.API_KEYS = 'abc123';
    const app = express();
    app.use((req, res, next) => { req.log = { warn: jest.fn() }; next(); });
    app.use(apiKeyAuth);
    app.get('/test', (req, res) => res.send('ok'));
    const res = await require('supertest')(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/API key/);
  });

  test('apiKeyAuth blocks invalid key', async () => {
    process.env.API_KEY_ENABLED = 'true';
    process.env.API_KEYS = 'abc123';
    const app = express();
    app.use((req, res, next) => { req.log = { warn: jest.fn() }; next(); });
    app.use(apiKeyAuth);
    app.get('/test', (req, res) => res.send('ok'));
    const res = await require('supertest')(app).get('/test').set('X-API-Key', 'wrong');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Invalid API key/);
  });

  test('apiKeyAuth allows valid key', async () => {
    process.env.API_KEY_ENABLED = 'true';
    process.env.API_KEYS = 'abc123';
    const app = express();
    app.use((req, res, next) => { req.log = { warn: jest.fn() }; next(); });
    app.use(apiKeyAuth);
    app.get('/test', (req, res) => res.send('ok'));
    const res = await require('supertest')(app).get('/test').set('X-API-Key', 'abc123');
    expect(res.status).toBe(200);
  });

  test('sanitizeInput strips control chars', () => {
    const req = { body: { a: 'hi\x00there\x1F' }, query: { b: 'ok\x7F' }, params: { c: 'x\x00' } };
    const res = {};
    const next = jest.fn();
    sanitizeInput(req, res, next);
    expect(req.body.a).toBe('hithere');
    expect(req.query.b).toBe('ok');
    expect(req.params.c).toBe('x');
    expect(next).toHaveBeenCalled();
  });

  test('sanitizeInput handles nested objects & arrays', () => {
    const req = { body: { list: ['A\x00', 'B\x1F', { deep: 'C\x7F' }], obj: { k: 'V\x00X' } } };
    sanitizeInput(req, {}, () => {});
    expect(req.body.list[0]).toBe('A');
    expect(req.body.list[1]).toBe('B');
    expect(req.body.list[2].deep).toBe('C');
    expect(req.body.obj.k).toBe('VX');
  });
});
