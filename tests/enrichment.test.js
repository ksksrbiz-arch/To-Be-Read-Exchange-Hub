const {
  enrichBookData,
  fetchFromOpenLibrary,
  fetchFromGoogleBooks,
} = require('../src/services/enrichment');
const axios = require('axios');

jest.mock('axios');

describe('Enrichment Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichBookData', () => {
    test('should enrich book data from Open Library and Google Books', async () => {
      const mockOpenLibraryResponse = {
        data: {
          'ISBN:9780747532743': {
            title: "Harry Potter and the Philosopher's Stone",
            authors: [{ name: 'J.K. Rowling' }],
            publishers: [{ name: 'Bloomsbury' }],
            cover: { large: 'http://covers.openlibrary.org/b/isbn/9780747532743-L.jpg' },
          },
        },
      };

      const mockGoogleBooksResponse = {
        data: {
          items: [
            {
              volumeInfo: {
                title: "Harry Potter and the Philosopher's Stone",
                authors: ['J.K. Rowling'],
                publisher: 'Bloomsbury Publishing',
                description: "A young wizard's journey begins...",
                imageLinks: {
                  thumbnail:
                    'http://books.google.com/books/content?id=wrOQLV6xB-wC&printsec=frontcover&img=1&zoom=1',
                },
              },
            },
          ],
        },
      };

      axios.get
        .mockResolvedValueOnce(mockOpenLibraryResponse)
        .mockResolvedValueOnce(mockGoogleBooksResponse);

      const result = await enrichBookData('9780747532743');

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('author');
      expect(result).toHaveProperty('publisher');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('cover_url');
      expect(result.isbn).toBe('9780747532743');
    });

    test('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));

      const result = await enrichBookData('invalid-isbn');

      expect(result).toHaveProperty('isbn', 'invalid-isbn');
      expect(result.title).toBeNull();
      expect(result.author).toBeNull();
    });
  });

  describe('fetchFromOpenLibrary', () => {
    test('should fetch book data from Open Library', async () => {
      const mockResponse = {
        data: {
          'ISBN:9780747532743': {
            title: 'Test Book',
            authors: [{ name: 'Test Author' }],
            publishers: [{ name: 'Test Publisher' }],
            cover: { large: 'http://test.com/cover.jpg' },
          },
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchFromOpenLibrary('9780747532743');

      expect(result.title).toBe('Test Book');
      expect(result.author).toBe('Test Author');
      expect(result.publisher).toBe('Test Publisher');
      expect(result.cover_url).toBe('http://test.com/cover.jpg');
    });

    test('should return null if book not found', async () => {
      axios.get.mockResolvedValue({ data: {} });

      const result = await fetchFromOpenLibrary('notfound');

      expect(result).toBeNull();
    });
  });

  describe('fetchFromGoogleBooks', () => {
    test('should fetch book data from Google Books', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              volumeInfo: {
                title: 'Test Book',
                authors: ['Test Author'],
                publisher: 'Test Publisher',
                description: 'Test description',
                imageLinks: { thumbnail: 'http://test.com/cover.jpg' },
              },
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchFromGoogleBooks('9780747532743');

      expect(result.title).toBe('Test Book');
      expect(result.author).toBe('Test Author');
      expect(result.publisher).toBe('Test Publisher');
      expect(result.description).toBe('Test description');
    });

    test('should return null if no items found', async () => {
      axios.get.mockResolvedValue({ data: { items: [] } });

      const result = await fetchFromGoogleBooks('notfound');

      expect(result).toBeNull();
    });
  });
});
