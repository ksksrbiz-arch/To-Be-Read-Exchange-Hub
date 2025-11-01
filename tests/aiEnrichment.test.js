const { enrichWithAI, generateCoverImage } = require('../src/services/aiEnrichment');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('AI Enrichment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.AI_PROVIDER_ORDER = 'gemini,claude,openai';
  });

  describe('enrichWithAI', () => {
    it('should enrich book with Gemini (first provider)', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  title: 'The Great Gatsby',
                  author: 'F. Scott Fitzgerald',
                  genre: 'Classic Fiction',
                  publisher: 'Scribner',
                  description: 'A novel set in the Jazz Age...',
                }),
              }],
            },
          }],
        },
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await enrichWithAI({
        isbn: '9780743273565',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('The Great Gatsby');
      expect(result.author).toBe('F. Scott Fitzgerald');
      expect(result.genre).toBe('Classic Fiction');
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    });

    it('should fallback to Claude when Gemini fails', async () => {
      const claudeResponse = {
        data: {
          content: [{
            text: JSON.stringify({
              title: 'To Kill a Mockingbird',
              author: 'Harper Lee',
              genre: 'Fiction',
            }),
          }],
        },
      };

      axios.post
        .mockRejectedValueOnce(new Error('Gemini API error'))
        .mockResolvedValueOnce(claudeResponse);

      const result = await enrichWithAI({
        isbn: '9780061120084',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('To Kill a Mockingbird');
      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post.mock.calls[1][0]).toContain('anthropic.com');
    });

    it('should fallback to OpenAI when Gemini and Claude fail', async () => {
      const openaiResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                title: '1984',
                author: 'George Orwell',
                genre: 'Dystopian Fiction',
              }),
            },
          }],
        },
      };

      axios.post
        .mockRejectedValueOnce(new Error('Gemini failed'))
        .mockRejectedValueOnce(new Error('Claude failed'))
        .mockResolvedValueOnce(openaiResponse);

      const result = await enrichWithAI({
        isbn: '9780451524935',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('1984');
      expect(axios.post).toHaveBeenCalledTimes(3);
      expect(axios.post.mock.calls[2][0]).toContain('openai.com');
    });

    it('should return null when all providers fail', async () => {
      axios.post.mockRejectedValue(new Error('All providers failed'));

      const result = await enrichWithAI({
        isbn: '9780000000000',
      });

      expect(result).toBeNull();
      expect(axios.post).toHaveBeenCalledTimes(3);
    });

    it('should parse JSON from markdown code blocks', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: '```json\n{"title": "Test Book", "author": "Test Author"}\n```',
              }],
            },
          }],
        },
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await enrichWithAI({ isbn: '9780000000000' });

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Book');
      expect(result.author).toBe('Test Author');
    });

    it('should handle malformed JSON gracefully', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: '{ title: invalid json }',
              }],
            },
          }],
        },
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await enrichWithAI({ isbn: '9780000000000' });

      expect(result).toBeNull();
    });
  });

  describe('generateCoverImage', () => {
    it('should generate cover image with DALL-E when enabled', async () => {
      process.env.ENABLE_AI_IMAGE_GEN = 'true';

      const mockResponse = {
        data: {
          data: [{
            url: 'https://example.com/generated-cover.png',
          }],
        },
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await generateCoverImage({
        title: 'Test Book',
        author: 'Test Author',
      });

      expect(result).toBe('https://example.com/generated-cover.png');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('openai.com'),
        expect.objectContaining({
          prompt: expect.stringContaining('Test Book'),
        }),
        expect.any(Object)
      );
    });

    it('should return null when image generation disabled', async () => {
      process.env.DISABLE_AI_IMAGE_GEN = 'true';

      const result = await generateCoverImage({
        title: 'Test Book',
        author: 'Test Author',
      });

      expect(result).toBeNull();
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should handle DALL-E API errors', async () => {
      process.env.ENABLE_AI_IMAGE_GEN = 'true';

      axios.post.mockRejectedValueOnce(new Error('DALL-E API error'));

      const result = await generateCoverImage({
        title: 'Test Book',
        author: 'Test Author',
      });

      expect(result).toBeNull();
    });
  });

  describe('Cost optimization', () => {
    it('should try cheapest provider first (Gemini)', async () => {
      const mockResponse = {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({ title: 'Book' }),
              }],
            },
          }],
        },
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      await enrichWithAI({ isbn: '9780000000000' });

      expect(axios.post.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    });

    it('should respect custom provider order', async () => {
      process.env.AI_PROVIDER_ORDER = 'openai,gemini,claude';

      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({ title: 'Book' }),
            },
          }],
        },
      };

      axios.post.mockResolvedValueOnce(mockResponse);

      await enrichWithAI({ isbn: '9780000000000' });

      expect(axios.post.mock.calls[0][0]).toContain('openai.com');
    });
  });
});
