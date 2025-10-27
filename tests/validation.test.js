const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');

jest.mock('../src/config/database');

describe('Request validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/books should 400 on invalid quantity', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '1234567890', quantity: -5 })
      .expect(400);

    expect(res.body.error).toBe('Validation error');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  test('PUT /api/books/:id should 400 when id is not an integer', async () => {
    const res = await request(app)
      .put('/api/books/not-a-number')
      .send({ title: 'Updated' })
      .expect(400);

    expect(res.body.error).toBe('Validation error');
  });

  test('POST /api/sync/pingo should 400 when books is wrong type', async () => {
    const res = await request(app)
      .post('/api/sync/pingo')
      .send({ books: 'not-an-array' })
      .expect(400);

    expect(res.body.error).toBe('Validation error');
  });

  test('POST /api/books passes validation for valid payload', async () => {
    pool.query = jest.fn().mockResolvedValue({ rows: [{ id: 1, isbn: '111', shelf_location: 'A', section: '1', quantity: 1, available_quantity: 1 }] });

    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '111', quantity: 1 })
      .expect(201);

    expect(res.body.success).toBe(true);
  });
});
