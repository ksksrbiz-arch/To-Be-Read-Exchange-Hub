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
    pool.query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: 1,
          isbn: '1234567890',
          shelf_location: 'A',
          section: '1',
          quantity: 1,
          available_quantity: 1,
        },
      ],
    });

    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '1234567890', quantity: 1 })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  test('POST /api/books should 400 on extremely long title', async () => {
    const longTitle = 'A'.repeat(501); // assume limit <= 500
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '1234567890123', quantity: 1, title: longTitle })
      .expect(400);

    expect(res.body.error).toBe('Validation error');
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'title' })]));
  });

  test('POST /api/books should 400 on invalid ISBN (too short)', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '123', quantity: 1 })
      .expect(400);
    expect(res.body.error).toBe('Validation error');
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'isbn' })]));
  });

  test('POST /api/books should 400 on invalid ISBN (non-numeric chars)', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: 'ABCDEF123X', quantity: 1 })
      .expect(400);
    expect(res.body.error).toBe('Validation error');
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'isbn' })]));
  });

  test('POST /api/books should 400 on zero quantity', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '1234567890123', quantity: 0 })
      .expect(400);
    expect(res.body.error).toBe('Validation error');
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'quantity' })]));
  });

  test('POST /api/books should 400 on missing quantity', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ isbn: '1234567890123' })
      .expect(400);
    expect(res.body.error).toBe('Validation error');
    expect(res.body.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'quantity' })]));
  });
});
