const { determineStorageLocation, parseLocation, calculateOptimalLocation } = require('../src/services/inventory');
const pool = require('../src/config/database');

jest.mock('../src/config/database');

describe('Inventory Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseLocation', () => {
    test('should parse dash format location', () => {
      const [shelf, section] = parseLocation('A-12');
      expect(shelf).toBe('A');
      expect(section).toBe('12');
    });

    test('should parse verbose format location', () => {
      const [shelf, section] = parseLocation('Shelf A, Section 12');
      expect(shelf).toBe('A');
      expect(section).toBe('12');
    });

    test('should handle plain text as shelf', () => {
      const [shelf, section] = parseLocation('A');
      expect(shelf).toBe('A');
      expect(section).toBeNull();
    });

    test('should handle null/undefined', () => {
      const [shelf, section] = parseLocation(null);
      expect(shelf).toBeNull();
      expect(section).toBeNull();
    });
  });

  describe('determineStorageLocation', () => {
    test('should use manual location if provided', async () => {
      const bookData = { title: 'Test', author: 'Author' };
      const result = await determineStorageLocation(bookData, 'A-12');

      expect(result.shelf_location).toBe('A');
      expect(result.section).toBe('12');
    });

    test('should calculate location if no manual location provided', async () => {
      const bookData = { title: 'Test', author: 'John Smith' };
      
      pool.query = jest.fn().mockResolvedValue({
        rows: [{ next_section: 5 }]
      });

      const result = await determineStorageLocation(bookData);

      expect(result).toHaveProperty('shelf_location');
      expect(result).toHaveProperty('section');
      expect(result.shelf_location).toBe('S'); // Based on Smith's last name
    });
  });

  describe('calculateOptimalLocation', () => {
    test('should organize by author last name first letter', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [{ next_section: 1 }]
      });

      const result = await calculateOptimalLocation({ author: 'Stephen King' });

      expect(result.shelf_location).toBe('K');
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['K']
      );
    });

    test('should handle unknown author', async () => {
      pool.query = jest.fn().mockResolvedValue({
        rows: [{ next_section: 1 }]
      });

      const result = await calculateOptimalLocation({ author: null });

      expect(result.shelf_location).toBe('U'); // Unknown -> U
    });

    test('should handle database errors gracefully', async () => {
      pool.query = jest.fn().mockRejectedValue(new Error('DB Error'));

      const result = await calculateOptimalLocation({ author: 'Test Author' });

      expect(result).toHaveProperty('shelf_location');
      expect(result).toHaveProperty('section');
    });
  });
});
