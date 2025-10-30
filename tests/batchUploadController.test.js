const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const fs = require('fs').promises;
const path = require('path');

describe('Batch Upload Controller', () => {
  let authToken;

  beforeAll(async () => {
    // Get auth token for tests
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM batch_uploads WHERE total_books < 10');
    await pool.query('DELETE FROM incoming_books WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    await pool.end();
  });

  describe('POST /api/batch/upload', () => {
    it('should accept valid CSV batch upload', async () => {
      const csvContent = `isbn,title,author,condition,quantity
9780123456789,Test Book 1,John Doe,Good,5
9789876543210,Test Book 2,Jane Smith,Like New,3`;

      const csvPath = path.join(__dirname, 'test-batch.csv');
      await fs.writeFile(csvPath, csvContent);

      const res = await request(app)
        .post('/api/batch/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manifest', csvPath)
        .expect(202);

      expect(res.body.success).toBe(true);
      expect(res.body.batch_id).toBeDefined();
      expect(res.body.total_books).toBe(2);

      // Cleanup
      await fs.unlink(csvPath);
    });

    it('should accept JSON batch upload with images', async () => {
      const jsonContent = JSON.stringify([
        {
          isbn: '9780123456789',
          title: 'Test Book with Image',
          author: 'Test Author',
          condition: 'New',
          quantity: 1,
        },
      ]);

      const jsonPath = path.join(__dirname, 'test-batch.json');
      const imagePath = path.join(__dirname, 'test-cover.jpg');
      
      // Create dummy image (1x1 pixel JPEG)
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      ]);
      await fs.writeFile(jsonPath, jsonContent);
      await fs.writeFile(imagePath, jpegBuffer);

      const res = await request(app)
        .post('/api/batch/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manifest', jsonPath)
        .attach('images', imagePath)
        .expect(202);

      expect(res.body.success).toBe(true);
      expect(res.body.batch_id).toBeDefined();

      // Cleanup
      await fs.unlink(jsonPath);
      await fs.unlink(imagePath);
    });

    it('should reject batch without manifest', async () => {
      const res = await request(app)
        .post('/api/batch/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject batch exceeding size limit', async () => {
      const books = Array(1001).fill(null).map((_, i) => ({
        isbn: `978${String(i).padStart(10, '0')}`,
        title: `Book ${i}`,
        author: 'Author',
      }));

      const jsonPath = path.join(__dirname, 'large-batch.json');
      await fs.writeFile(jsonPath, JSON.stringify(books));

      const res = await request(app)
        .post('/api/batch/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manifest', jsonPath)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.message.includes('too large'))).toBe(true);

      // Cleanup
      await fs.unlink(jsonPath);
    });

    it('should validate ISBN format', async () => {
      const csvContent = `isbn,title,author
invalid-isbn,Test Book,Author`;

      const csvPath = path.join(__dirname, 'invalid-isbn.csv');
      await fs.writeFile(csvPath, csvContent);

      const res = await request(app)
        .post('/api/batch/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('manifest', csvPath)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.message && e.message.includes('ISBN'))).toBe(true);

      // Cleanup
      await fs.unlink(csvPath);
    });
  });

  describe('GET /api/batch/:id', () => {
    let testBatchId;

    beforeAll(async () => {
      // Create test batch
      const result = await pool.query(
        `INSERT INTO batch_uploads (user_id, total_books, status, processed_books, successful_books, failed_books)
         VALUES (1, 10, 'processing', 5, 4, 1)
         RETURNING id`
      );
      testBatchId = result.rows[0].id;
    });

    it('should return batch status', async () => {
      const res = await request(app)
        .get(`/api/batch/${testBatchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.batch).toBeDefined();
      expect(res.body.batch.id).toBe(testBatchId);
      expect(res.body.batch.progress).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent batch', async () => {
      const res = await request(app)
        .get('/api/batch/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/batch/inventory/status', () => {
    it('should return inventory capacity status', async () => {
      const res = await request(app)
        .get('/api/batch/inventory/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.capacity).toBeDefined();
      expect(Array.isArray(res.body.capacity)).toBe(true);
    });
  });

  describe('GET /api/batch/queue', () => {
    let testBatchId;

    beforeAll(async () => {
      // Create test batch with queue items
      const batchResult = await pool.query(
        `INSERT INTO batch_uploads (user_id, total_books, status)
         VALUES (1, 2, 'processing')
         RETURNING id`
      );
      testBatchId = batchResult.rows[0].id;

      await pool.query(
        `INSERT INTO incoming_books (batch_id, isbn, title, processing_status)
         VALUES ($1, '9780000000001', 'Queue Test 1', 'pending'),
                ($1, '9780000000002', 'Queue Test 2', 'completed')`,
        [testBatchId]
      );
    });

    it('should return queue items for batch', async () => {
      const res = await request(app)
        .get(`/api/batch/queue?batch_id=${testBatchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.queue).toBeDefined();
      expect(res.body.queue.length).toBeGreaterThan(0);
    });

    it('should filter queue by status', async () => {
      const res = await request(app)
        .get(`/api/batch/queue?batch_id=${testBatchId}&status=completed`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.queue.every(item => item.processing_status === 'completed')).toBe(true);
    });
  });
});
