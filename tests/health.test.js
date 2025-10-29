const request = require('supertest');
const app = require('../src/server');

describe('Health endpoint', () => {
  test('GET /health returns ok with timestamp', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('GET /api/health/db returns ok with db connected', async () => {
    const res = await request(app).get('/api/health/db').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('db', 'connected');
  });
});
