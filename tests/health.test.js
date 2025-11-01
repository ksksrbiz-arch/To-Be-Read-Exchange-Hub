const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');

jest.mock('../src/config/database');

describe('Health endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health returns ok with timestamp', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('GET /api/health/db returns ok with db connected', async () => {
    pool.query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const res = await request(app).get('/api/health/db').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('db', 'connected');
    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
  });
});
