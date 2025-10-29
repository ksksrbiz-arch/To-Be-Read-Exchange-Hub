const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const { enrichBookData } = require('../src/services/enrichment');
const { calculateOptimalLocation } = require('../src/services/inventory');

jest.mock('../src/config/database');
jest.mock('../src/services/enrichment');

describe('Guards and defensive behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createBook should succeed when enrichment returns null (no crash)', async () => {
    // enrichment returns null instead of object
    enrichBookData.mockResolvedValue(null);

    // DB returns inserted row even when title/author are null
    pool.query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: 123,
          isbn: '0000000000',
          title: null,
          author: null,
          shelf_location: 'A',
          section: '1',
          quantity: 1,
          available_quantity: 1,
        },
      ],
    });

    const response = await request(app)
      .post('/api/books')
      .send({ isbn: '0000000000', quantity: 1 })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.book).toHaveProperty('id', 123);
    expect(enrichBookData).toHaveBeenCalledWith('0000000000');
  });

  test('calculateOptimalLocation should fallback when pool.query returns undefined', async () => {
    // Simulate an unusual DB mock that resolves to undefined
    pool.query = jest.fn().mockResolvedValue(undefined);

    const bookData = { author: 'Jane Doe' };
    const location = await calculateOptimalLocation(bookData);

    expect(location).toHaveProperty('shelf_location');
    expect(location).toHaveProperty('section');
    // Section should be a string and default to '1'
    expect(location.section).toBe('1');
  });
});
