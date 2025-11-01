const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');

/**
 * Circuit breaker configuration for external API calls
 * Prevents cascading failures and provides fallback behavior
 */
const createCircuitBreaker = (fn, options = {}) => {
  const defaultOptions = {
    timeout: 5000, // 5 seconds
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000, // Try again after 30 seconds
    rollingCountTimeout: 10000, // 10 second rolling window
    rollingCountBuckets: 10,
    name: options.name || 'unknown',
  };

  const breaker = new CircuitBreaker(fn, { ...defaultOptions, ...options });

  // Event logging
  breaker.on('open', () => {
    logger.warn({ name: breaker.name }, 'Circuit breaker opened - too many failures');
  });

  breaker.on('halfOpen', () => {
    logger.info({ name: breaker.name }, 'Circuit breaker half-open - testing recovery');
  });

  breaker.on('close', () => {
    logger.info({ name: breaker.name }, 'Circuit breaker closed - service recovered');
  });

  breaker.on('fallback', (result) => {
    logger.warn({ name: breaker.name, result }, 'Circuit breaker fallback executed');
  });

  // Provide health metrics
  breaker.healthCheck = () => ({
    name: breaker.name,
    state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
    stats: breaker.stats,
  });

  return breaker;
};

/**
 * Fallback data provider when external APIs fail
 */
const createFallbackData = (isbn) => ({
  title: 'Unknown Book',
  author: 'Unknown Author',
  publisher: null,
  description: 'Book information temporarily unavailable. Please try again later.',
  cover_url: null,
  isbn,
});

module.exports = {
  createCircuitBreaker,
  createFallbackData,
};
