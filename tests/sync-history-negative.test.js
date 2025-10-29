const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');

jest.mock('../src/config/database');

describe('Sync history negative cases', () => {
  afterEach(() => jest.clearAllMocks());

  test('GET /api/sync/history returns empty array when no rows', async () => {
    pool.query = jest.fn().mockResolvedValue({ rows: [] });
    const res = await request(app).get('/api/sync/history').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.syncHistory)).toBe(true);
    expect(res.body.syncHistory).toHaveLength(0);
  });

  test('GET /api/sync/history 500 on db error', async () => {
    pool.query = jest.fn().mockRejectedValue(new Error('DB explode'));
    const res = await request(app).get('/api/sync/history').expect(500);
    expect(res.body.error).toBe('Failed to fetch sync history');
  });
});
