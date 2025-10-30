const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const { enrichBookData } = require('../src/services/enrichment');

jest.mock('../src/config/database');
jest.mock('../src/services/enrichment');

describe('Books API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/books', () => {
    test('should create a new book with ISBN enrichment', async () => {
      enrichBookData.mockResolvedValue({
        isbn: '9780747532743',
        title: 'Harry Potter',
        author: 'J.K. Rowling',
        publisher: 'Bloomsbury',
        description: 'A wizard story',
        cover_url: 'http://example.com/cover.jpg',
      });

      pool.query = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            isbn: '9780747532743',
            title: 'Harry Potter',
            author: 'J.K. Rowling',
            shelf_location: 'R',
            section: '1',
            quantity: 1,
            available_quantity: 1,
          },
        ],
      });

      const response = await request(app)
        .post('/api/books')
        .send({
          isbn: '9780747532743',
          quantity: 1,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.book).toHaveProperty('isbn', '9780747532743');
      expect(enrichBookData).toHaveBeenCalledWith('9780747532743');
    });

    test('should create a book with manual shelf location', async () => {
      enrichBookData.mockResolvedValue({
        isbn: '9780747532743',
        title: 'Test Book',
        author: 'Test Author',
        publisher: null,
        description: null,
        cover_url: null,
      });

      pool.query = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 2,
            isbn: '9780747532743',
            shelf_location: 'A',
            section: '12',
            quantity: 1,
          },
        ],
      });

      const response = await request(app)
        .post('/api/books')
        .send({
          isbn: '9780747532743',
          shelf_location: 'A-12',
          quantity: 1,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.book.shelf_location).toBe('A');
      expect(response.body.book.section).toBe('12');
    });

    test('should return 400 if ISBN and title are missing', async () => {
      const response = await request(app)
        .post('/api/books')
        .send({
          author: 'Test Author',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Either ISBN or title is required' }),
        ])
      );
    });

    test('should handle enrichment errors gracefully', async () => {
      enrichBookData.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/api/books')
        .send({
          isbn: '9780747532743',
          quantity: 1,
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to create book');
    });
  });

  describe('GET /api/books', () => {
    test('should return all books', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Book 1',
            author: 'Author 1',
            quantity: 5,
          },
          {
            id: 2,
            title: 'Book 2',
            author: 'Author 2',
            quantity: 3,
          },
        ],
      });

      const response = await request(app).get('/api/books').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.books).toHaveLength(2);
    });
  });

  describe('GET /api/books/:id', () => {
    test('should return a single book', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Book 1',
            author: 'Author 1',
          },
        ],
      });

      const response = await request(app).get('/api/books/1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.book.id).toBe(1);
    });

    test('should return 404 if book not found', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [],
      });

      const response = await request(app).get('/api/books/999').expect(404);

      expect(response.body.error).toBe('Book not found');
    });
  });

  describe('PUT /api/books/:id', () => {
    test('should update a book', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Updated Title',
            quantity: 10,
          },
        ],
      });

      const response = await request(app)
        .put('/api/books/1')
        .send({
          title: 'Updated Title',
          quantity: 10,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.book.title).toBe('Updated Title');
    });

    test('should return 400 if no valid fields', async () => {
      const response = await request(app)
        .put('/api/books/1')
        .send({
          invalid_field: 'value',
        })
        .expect(400);

      expect(response.body.error).toBe('No valid fields to update');
    });
  });

  describe('DELETE /api/books/:id', () => {
    test('should delete a book', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [{ id: 1 }],
      });

      const response = await request(app).delete('/api/books/1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Book deleted successfully');
    });

    test('should return 404 if book not found', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [],
      });

      const response = await request(app).delete('/api/books/999').expect(404);

      expect(response.body.error).toBe('Book not found');
    });
  });
});
