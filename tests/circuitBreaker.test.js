const { createCircuitBreaker, createFallbackData } = require('../src/middleware/circuitBreaker');

describe('circuitBreaker', () => {
  test('createFallbackData returns default object', () => {
    const isbn = '1234567890';
    const fallback = createFallbackData(isbn);
    expect(fallback.title).toBe('Unknown Book');
    expect(fallback.author).toBe('Unknown Author');
    expect(fallback.isbn).toBe(isbn);
  });

  test('breaker transitions and healthCheck', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const breaker = createCircuitBreaker(fn, { name: 'testBreaker', timeout: 50 });
    expect(breaker.healthCheck().name).toBe('testBreaker');
    expect(['open', 'half-open', 'closed']).toContain(breaker.healthCheck().state);
    await expect(breaker.fire()).resolves.toBe('ok');
  });

  test('breaker fallback triggers on error', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    const breaker = createCircuitBreaker(fn, { name: 'failBreaker', timeout: 10 });
    breaker.fallback(() => 'fallback');
    await expect(breaker.fire()).resolves.toBe('fallback');
  });
});
