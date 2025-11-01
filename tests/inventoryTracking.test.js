const {
  findOptimalShelf,
  getShelfCapacity,
  updateShelfCount,
  getInventoryStatus,
  getIncomingQueue,
} = require('../src/services/inventoryTracking');
const pool = require('../src/config/database');

describe('Inventory Tracking Service', () => {
  beforeAll(async () => {
    // Setup test shelves
    await pool.query(`
      INSERT INTO shelf_capacity (shelf_location, section, max_capacity, current_count, genre_preference, notes)
      VALUES 
        ('A', '01', 100, 50, 'Fiction', 'Main floor'),
        ('A', '02', 100, 90, 'Fiction', 'Main floor'),
        ('B', '01', 150, 30, 'Non-Fiction', 'Second floor'),
        ('C', '01', 200, 0, 'Science Fiction', 'Third floor')
      ON CONFLICT (shelf_location, section) DO UPDATE 
      SET current_count = EXCLUDED.current_count
    `);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM shelf_capacity WHERE shelf_location IN (\'A\', \'B\', \'C\', \'OVERFLOW\')');
    await pool.query('DELETE FROM incoming_books WHERE isbn LIKE \'TEST-%\'');
    await pool.end();
  });

  describe('findOptimalShelf', () => {
    it('should place book in shelf matching genre', async () => {
      const result = await findOptimalShelf({
        title: 'Test Fiction Book',
        author: 'John Doe',
        genre: 'Fiction',
      });

      expect(result).toBeDefined();
      expect(result.shelf).toBe('A');
      expect(result.utilization).toBeLessThan(100);
    });

    it('should place book alphabetically by author when genre matches', async () => {
      const result = await findOptimalShelf({
        title: 'Science Fiction Book',
        author: 'Adams, Douglas',
        genre: 'Science Fiction',
      });

      expect(result).toBeDefined();
      expect(result.shelf).toBe('C');
    });

    it('should avoid nearly full shelves', async () => {
      const result = await findOptimalShelf({
        title: 'Another Fiction Book',
        author: 'Smith, Jane',
        genre: 'Fiction',
      });

      expect(result).toBeDefined();
      // Should prefer A-01 (50% full) over A-02 (90% full)
      expect(result.section).toBe('01');
    });

    it('should create overflow shelf when all are full', async () => {
      // Fill all Fiction shelves
      await pool.query(
        'UPDATE shelf_capacity SET current_count = max_capacity WHERE genre_preference = $1',
        ['Fiction']
      );

      const result = await findOptimalShelf({
        title: 'Overflow Book',
        author: 'Test Author',
        genre: 'Fiction',
      });

      expect(result).toBeDefined();
      expect(result.shelf).toBe('OVERFLOW');

      // Cleanup
      await pool.query(
        'UPDATE shelf_capacity SET current_count = 50 WHERE shelf_location = $1 AND section = $2',
        ['A', '01']
      );
    });

    it('should respect manual shelf preference', async () => {
      const result = await findOptimalShelf(
        {
          title: 'Specific Location Book',
          author: 'Author',
          genre: 'Fiction',
        },
        { preferredShelf: 'B-01' }
      );

      expect(result).toBeDefined();
      expect(result.shelf).toBe('B');
      expect(result.section).toBe('01');
    });

    it('should handle books without genre', async () => {
      const result = await findOptimalShelf({
        title: 'Unclassified Book',
        author: 'Unknown',
      });

      expect(result).toBeDefined();
      expect(result.shelf).toBeDefined();
    });
  });

  describe('getShelfCapacity', () => {
    it('should return capacity details for specific shelf', async () => {
      const result = await getShelfCapacity('A', '01');

      expect(result).toBeDefined();
      expect(result.max_capacity).toBe(100);
      expect(result.current_count).toBeGreaterThanOrEqual(0);
      expect(result.utilization).toBeDefined();
      expect(result.available).toBeDefined();
    });

    it('should return null for non-existent shelf', async () => {
      const result = await getShelfCapacity('Z', '99');

      expect(result).toBeNull();
    });

    it('should calculate utilization percentage correctly', async () => {
      await pool.query(
        'UPDATE shelf_capacity SET current_count = 75 WHERE shelf_location = $1 AND section = $2',
        ['A', '01']
      );

      const result = await getShelfCapacity('A', '01');

      expect(result.utilization).toBe(75); // 75/100 * 100
    });
  });

  describe('updateShelfCount', () => {
    it('should increment shelf count', async () => {
      const before = await getShelfCapacity('B', '01');
      
      await updateShelfCount('B', '01', 5);

      const after = await getShelfCapacity('B', '01');

      expect(after.current_count).toBe(before.current_count + 5);
    });

    it('should decrement shelf count', async () => {
      const before = await getShelfCapacity('B', '01');
      
      await updateShelfCount('B', '01', -3);

      const after = await getShelfCapacity('B', '01');

      expect(after.current_count).toBe(before.current_count - 3);
    });

    it('should not allow negative count', async () => {
      await pool.query(
        'UPDATE shelf_capacity SET current_count = 5 WHERE shelf_location = $1 AND section = $2',
        ['C', '01']
      );

      await updateShelfCount('C', '01', -10);

      const result = await getShelfCapacity('C', '01');

      expect(result.current_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getInventoryStatus', () => {
    it('should return all shelf capacities', async () => {
      const result = await getInventoryStatus();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('shelf');
      expect(result[0]).toHaveProperty('section');
      expect(result[0]).toHaveProperty('utilization');
    });

    it('should sort by shelf and section', async () => {
      const result = await getInventoryStatus();

      for (let i = 1; i < result.length; i++) {
        const prev = `${result[i - 1].shelf}-${result[i - 1].section}`;
        const curr = `${result[i].shelf}-${result[i].section}`;
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('getIncomingQueue', () => {
    let testBatchId;

    beforeAll(async () => {
      // Create test batch
      const batchResult = await pool.query(
        'INSERT INTO batch_uploads (user_id, total_books, status) VALUES (1, 3, \'processing\') RETURNING id'
      );
      testBatchId = batchResult.rows[0].id;

      // Add queue items
      await pool.query(
        `INSERT INTO incoming_books (batch_id, isbn, title, processing_status, shelf_location)
         VALUES 
           ($1, 'TEST-001', 'Queue Book 1', 'pending', NULL),
           ($1, 'TEST-002', 'Queue Book 2', 'completed', 'A-01'),
           ($1, 'TEST-003', 'Queue Book 3', 'failed', NULL)`,
        [testBatchId]
      );
    });

    it('should return all queue items for batch', async () => {
      const result = await getIncomingQueue({ batch_id: testBatchId });

      expect(result.length).toBe(3);
    });

    it('should filter queue by status', async () => {
      const result = await getIncomingQueue({
        batch_id: testBatchId,
        status: 'completed',
      });

      expect(result.length).toBe(1);
      expect(result[0].processing_status).toBe('completed');
    });

    it('should return pending items when no filter', async () => {
      const result = await getIncomingQueue({
        batch_id: testBatchId,
        status: 'pending',
      });

      expect(result.length).toBe(1);
      expect(result[0].isbn).toBe('TEST-001');
    });

    it('should return empty array for non-existent batch', async () => {
      const result = await getIncomingQueue({ batch_id: 99999 });

      expect(result).toEqual([]);
    });
  });

  describe('Shelf allocation edge cases', () => {
    it('should handle very long author names', async () => {
      const result = await findOptimalShelf({
        title: 'Book',
        author: 'A'.repeat(300),
        genre: 'Fiction',
      });

      expect(result).toBeDefined();
    });

    it('should handle special characters in genre', async () => {
      const result = await findOptimalShelf({
        title: 'Book',
        author: 'Author',
        genre: 'Science-Fiction & Fantasy',
      });

      expect(result).toBeDefined();
    });

    it('should handle concurrent shelf allocations', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        findOptimalShelf({
          title: `Concurrent Book ${i}`,
          author: 'Author',
          genre: 'Fiction',
        })
      );

      const results = await Promise.all(promises);

      expect(results.every(r => r !== null)).toBe(true);
    });
  });
});
