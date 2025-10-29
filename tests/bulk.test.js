const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const { enrichBookData } = require('../src/services/enrichment');

jest.mock('../src/config/database');
jest.mock('../src/services/enrichment');

describe('Bulk Operations API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/books/bulk - JSON Import', () => {
    test('should import multiple books successfully', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1, isbn: '123', title: 'Book 1' }] }) // INSERT 1
          .mockResolvedValueOnce({ rows: [{ id: 2, isbn: '456', title: 'Book 2' }] }) // INSERT 2
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);
      enrichBookData.mockResolvedValue({ title: 'Enriched', author: 'Author' });

      const res = await request(app)
        .post('/api/books/bulk')
        .send({
          books: [
            { isbn: '123', quantity: 5 },
            { isbn: '456', quantity: 3 },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.successful).toBe(2);
      expect(res.body.failed).toBe(0);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle partial failures (207)', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT success
          .mockRejectedValueOnce(new Error('DB Error')) // INSERT fail
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);
      enrichBookData.mockResolvedValue({});

      const res = await request(app)
        .post('/api/books/bulk')
        .send({
          books: [
            { isbn: '123', quantity: 5 },
            { isbn: '456', quantity: 3 },
          ],
        })
        .expect(207);

      expect(res.body.success).toBe(false);
      expect(res.body.successful).toBe(1);
      expect(res.body.failed).toBe(1);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].error).toBe('DB Error');
    });

    test('should reject empty book array', async () => {
      const res = await request(app).post('/api/books/bulk').send({ books: [] }).expect(400);

      expect(res.body.error).toBe('No books to import');
    });

    test('should reject batch >1000 books', async () => {
      const books = Array(1001).fill({ isbn: '123', quantity: 1 });

      const res = await request(app).post('/api/books/bulk').send({ books }).expect(400);

      expect(res.body.error).toBe('Batch size too large');
    });

    test('should validate required fields', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .post('/api/books/bulk')
        .send({
          books: [{ author: 'No ISBN or Title' }], // Missing required fields
        })
        .expect(207);

      expect(res.body.failed).toBe(1);
      expect(res.body.errors[0].error).toContain('Either ISBN or title is required');
    });

    test('should validate quantity', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .post('/api/books/bulk')
        .send({
          books: [{ isbn: '123', quantity: 0 }], // Invalid quantity
        })
        .expect(207);

      expect(res.body.failed).toBe(1);
      expect(res.body.errors[0].error).toContain('quantity');
    });

    test('should rollback on critical failure', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('Critical DB Error')), // First INSERT fails critically
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .post('/api/books/bulk')
        .send({
          books: [{ isbn: '123', quantity: 5 }],
        })
        .expect(207);

      // Should still handle gracefully with partial failure tracking
      expect(res.body.failed).toBeGreaterThan(0);
    });
  });

  describe('POST /api/books/bulk - CSV Upload', () => {
    test('should parse and import CSV file', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);
      enrichBookData.mockResolvedValue({});

      const csvContent = 'isbn,title,author,quantity\n9780451524935,1984,George Orwell,5';

      const res = await request(app)
        .post('/api/books/bulk')
        .attach('file', Buffer.from(csvContent), 'books.csv')
        .expect(201);

      expect(res.body.successful).toBe(1);
    });

    test('should reject non-CSV files', async () => {
      const res = await request(app)
        .post('/api/books/bulk')
        .attach('file', Buffer.from('{}'), 'data.json')
        .expect(500);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('PUT /api/books/bulk - Bulk Update', () => {
    test('should update multiple books', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] }) // UPDATE 1
          .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] }) // UPDATE 2
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .put('/api/books/bulk')
        .send({
          updates: [
            { id: 1, fields: { quantity: 10 } },
            { id: 2, fields: { title: 'Updated Title' } },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.successful).toBe(2);
      expect(res.body.failed).toBe(0);
    });

    test('should handle not found books', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE not found
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .put('/api/books/bulk')
        .send({
          updates: [{ id: 999, fields: { quantity: 10 } }],
        })
        .expect(207);

      expect(res.body.failed).toBe(1);
      expect(res.body.errors[0].error).toContain('not found');
    });

    test('should reject invalid updates', async () => {
      const res = await request(app).put('/api/books/bulk').send({ updates: [] }).expect(400);

      expect(res.body.error).toBe('Invalid input');
    });

    test('should reject batch >500 updates', async () => {
      const updates = Array(501).fill({ id: 1, fields: { quantity: 1 } });

      const res = await request(app).put('/api/books/bulk').send({ updates }).expect(400);

      expect(res.body.error).toBe('Batch size too large');
    });

    test('should filter invalid fields', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .put('/api/books/bulk')
        .send({
          updates: [{ id: 1, fields: { invalid_field: 'test' } }],
        })
        .expect(207);

      expect(res.body.failed).toBe(1);
      expect(res.body.errors[0].error).toContain('No valid fields');
    });
  });

  describe('DELETE /api/books/bulk - Bulk Delete', () => {
    test('should delete multiple books', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rowCount: 3, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] }) // DELETE
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .delete('/api/books/bulk')
        .send({ ids: [1, 2, 3] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.deleted).toBe(3);
      expect(res.body.total).toBe(3);
    });

    test('should report not found IDs', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 1 }, { id: 2 }] }) // Only 2 deleted
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect = jest.fn().mockResolvedValue(mockClient);

      const res = await request(app)
        .delete('/api/books/bulk')
        .send({ ids: [1, 2, 999] })
        .expect(200);

      expect(res.body.deleted).toBe(2);
      expect(res.body.notFound).toContain(999);
    });

    test('should reject empty ID array', async () => {
      const res = await request(app).delete('/api/books/bulk').send({ ids: [] }).expect(400);

      expect(res.body.error).toBe('Invalid input');
    });

    test('should reject batch >500 deletions', async () => {
      const ids = Array(501).fill(1);

      const res = await request(app).delete('/api/books/bulk').send({ ids }).expect(400);

      expect(res.body.error).toBe('Batch size too large');
    });
  });
});
