const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const { enrichBookData } = require('../src/services/enrichment');

jest.mock('../src/config/database');
jest.mock('../src/services/enrichment');

describe('Sync API', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect = jest.fn().mockResolvedValue(mockClient);
    pool.query = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sync/pingo', () => {
    test('should sync Pingo inventory data', async () => {
      enrichBookData.mockResolvedValue({
        isbn: '9780747532743',
        title: 'Harry Potter',
        author: 'J.K. Rowling',
        publisher: 'Bloomsbury',
        description: 'Test',
        cover_url: 'http://test.com/cover.jpg'
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT book
        .mockResolvedValueOnce({}) // INSERT sync log
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/sync/pingo')
        .send({
          books: [
            {
              isbn: '9780747532743',
              title: 'Harry Potter',
              author: 'J.K. Rowling',
              quantity: 5
            }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.booksSynced).toBe(1);
      expect(response.body.totalBooks).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle multiple books', async () => {
      enrichBookData.mockResolvedValue({
        title: 'Test Book',
        author: 'Test Author',
        publisher: null,
        description: null,
        cover_url: null
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT book 1
        .mockResolvedValueOnce({}) // INSERT book 2
        .mockResolvedValueOnce({}) // INSERT book 3
        .mockResolvedValueOnce({}) // INSERT sync log
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/sync/pingo')
        .send({
          books: [
            { isbn: '1111111111111', title: 'Book 1', quantity: 1 },
            { isbn: '2222222222222', title: 'Book 2', quantity: 2 },
            { isbn: '3333333333333', title: 'Book 3', quantity: 3 }
          ]
        })
        .expect(200);

      expect(response.body.booksSynced).toBe(3);
      expect(response.body.totalBooks).toBe(3);
    });

    test('should handle partial sync with errors', async () => {
      enrichBookData
        .mockResolvedValueOnce({ title: 'Book 1', author: 'Author 1' })
        .mockResolvedValueOnce({ title: 'Book 2', author: 'Author 2' });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT book 1 - success
        .mockRejectedValueOnce(new Error('DB Error')) // INSERT book 2 - error
        .mockResolvedValueOnce({}) // INSERT sync log
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/sync/pingo')
        .send({
          books: [
            { isbn: '1111111111111', title: 'Book 1', quantity: 1 },
            { isbn: '2222222222222', title: 'Book 2', quantity: 2 }
          ]
        })
        .expect(200);

      expect(response.body.booksSynced).toBe(1);
      expect(response.body.totalBooks).toBe(2);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toHaveLength(1);
    });

    test('should return 400 if books array is missing', async () => {
      const response = await request(app)
        .post('/api/sync/pingo')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Invalid request: books array is required');
    });

    test('should rollback on critical failure', async () => {
      enrichBookData.mockResolvedValue({
        title: 'Test Book',
        author: 'Test Author'
      });

      mockClient.query
        .mockRejectedValueOnce(new Error('Critical DB Error')); // BEGIN fails

      pool.query = jest.fn().mockResolvedValue({}); // For logging

      const response = await request(app)
        .post('/api/sync/pingo')
        .send({
          books: [
            { isbn: '1111111111111', title: 'Book 1', quantity: 1 }
          ]
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to sync Pingo inventory');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('GET /api/sync/history', () => {
    test('should return sync history', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            sync_date: '2025-01-01T00:00:00Z',
            books_synced: 10,
            status: 'success',
            error_message: null
          },
          {
            id: 2,
            sync_date: '2025-01-02T00:00:00Z',
            books_synced: 5,
            status: 'partial',
            error_message: 'Some errors'
          }
        ]
      });

      const response = await request(app)
        .get('/api/sync/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.syncHistory).toHaveLength(2);
    });
  });
});
