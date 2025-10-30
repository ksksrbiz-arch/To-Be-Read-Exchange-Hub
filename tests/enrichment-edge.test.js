const { enrichBookData } = require('../src/services/enrichment');
const axios = require('axios');

jest.mock('axios');

describe('Enrichment edge cases', () => {
  afterEach(() => jest.clearAllMocks());

  test('handles Open Library returning partial (no authors, no publishers)', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { 'ISBN:123': { title: 'Partial Book' } } })
      .mockResolvedValueOnce({ data: { items: [] } });

    const result = await enrichBookData('123');
    expect(result.title).toBe('Partial Book');
    expect(result.author).toBeNull();
    expect(result.publisher).toBeNull();
  });

  test('handles Google Books only (Open Library empty)', async () => {
    axios.get.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({
      data: {
        items: [
          {
            volumeInfo: {
              title: 'GB Only',
              authors: ['Solo Author'],
              publisher: 'GB Publisher',
              description: 'Desc',
              imageLinks: { thumbnail: 'http://img/cover.jpg' },
            },
          },
        ],
      },
    });

    const result = await enrichBookData('456');
    expect(result.title).toBe('GB Only');
    expect(result.author).toBe('Solo Author');
    expect(result.publisher).toBe('GB Publisher');
    expect(result.cover_url).toContain('http://img/cover.jpg');
  });
});
