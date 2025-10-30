const logger = require('../utils/logger');

/**
 * Performance optimization utilities for batch upload system
 */

/**
 * Concurrency limiter for batch processing
 * Prevents overwhelming the system with too many parallel operations
 */
class ConcurrencyLimiter {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Execute function with concurrency limit
   */
  async execute(fn) {
    while (this.running >= this.maxConcurrent) {
      // Wait for a slot to free up
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      
      // Release next queued operation
      if (this.queue.length > 0) {
        const resolve = this.queue.shift();
        resolve();
      }
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Clear queue (for testing)
   */
  clear() {
    this.queue.forEach(resolve => resolve());
    this.queue = [];
    this.running = 0;
  }
}

// Create singleton instance for book enrichment
// Limit to 5 concurrent enrichment operations
const enrichmentLimiter = new ConcurrencyLimiter(5);

/**
 * Process array in batches with concurrency control
 */
async function processBatch(items, processFn, options = {}) {
  const {
    batchSize = 10, // Process 10 items at a time
    concurrency = 3, // Max 3 concurrent batches
    onProgress = null, // Progress callback
  } = options;

  const results = [];
  const errors = [];
  const limiter = new ConcurrencyLimiter(concurrency);

  // Split into batches
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  let completed = 0;

  // Process batches with concurrency control
  const batchPromises = batches.map((batch, batchIndex) =>
    limiter.execute(async () => {
      const batchResults = [];
      const batchErrors = [];

      for (const [itemIndex, item] of batch.entries()) {
        try {
          const result = await processFn(item, i + itemIndex);
          batchResults.push(result);
        } catch (error) {
          batchErrors.push({
            item,
            index: batchIndex * batchSize + itemIndex,
            error: error.message,
          });
        }

        completed++;
        if (onProgress) {
          onProgress(completed, items.length);
        }
      }

      return { results: batchResults, errors: batchErrors };
    })
  );

  const batchOutputs = await Promise.all(batchPromises);

  // Combine results
  batchOutputs.forEach(({ results: batchResults, errors: batchErrors }) => {
    results.push(...batchResults);
    errors.push(...batchErrors);
  });

  return { results, errors };
}

/**
 * Database connection pool manager
 * Reuses connections to avoid overhead
 */
class ConnectionPool {
  constructor(pool) {
    this.pool = pool;
    this.activeConnections = 0;
    this.peakConnections = 0;
  }

  /**
   * Get connection from pool
   */
  async getConnection() {
    const client = await this.pool.connect();
    this.activeConnections++;
    this.peakConnections = Math.max(this.peakConnections, this.activeConnections);

    logger.debug('Connection acquired', {
      active: this.activeConnections,
      peak: this.peakConnections,
    });

    return client;
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(client) {
    if (client) {
      client.release();
      this.activeConnections--;

      logger.debug('Connection released', {
        active: this.activeConnections,
      });
    }
  }

  /**
   * Execute query with automatic connection management
   */
  async query(text, params) {
    const client = await this.getConnection();
    try {
      return await client.query(text, params);
    } finally {
      this.releaseConnection(client);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      active: this.activeConnections,
      peak: this.peakConnections,
    };
  }
}

/**
 * Image optimization utilities
 */
const imageOptimization = {
  /**
   * Calculate optimal image dimensions
   * Maintains aspect ratio while fitting within max dimensions
   */
  calculateDimensions(originalWidth, originalHeight, maxWidth = 800, maxHeight = 1200) {
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
      aspectRatio,
    };
  },

  /**
   * Estimate optimized file size (rough approximation)
   */
  estimateSize(width, height, quality = 0.8) {
    // Rough estimate: JPEG compression ~10 bytes per pixel at 80% quality
    const pixels = width * height;
    const bytesPerPixel = 10 * quality;
    return Math.round(pixels * bytesPerPixel);
  },
};

/**
 * CSV streaming parser for large files
 * Processes CSV line-by-line to avoid loading entire file in memory
 */
async function streamCSV(filePath, onRow, options = {}) {
  const fs = require('fs');
  const readline = require('readline');

  const {
    skipHeader = true,
    maxRows = 1000,
  } = options;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let rowCount = 0;
    let headers = [];
    const results = [];

    rl.on('line', async (line) => {
      if (rowCount === 0 && skipHeader) {
        headers = line.split(',').map(h => h.trim().toLowerCase());
        rowCount++;
        return;
      }

      if (rowCount >= maxRows) {
        rl.close();
        return;
      }

      const values = line.split(',');
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });

      try {
        await onRow(row, rowCount);
        results.push(row);
      } catch (error) {
        logger.error('CSV row processing error', {
          row: rowCount,
          error: error.message,
        });
      }

      rowCount++;
    });

    rl.on('close', () => {
      resolve(results);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Memoization cache for expensive operations
 */
class MemoCache {
  constructor(maxSize = 100, ttlMs = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get cached value or compute and store
   */
  async get(key, computeFn) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      logger.debug('Cache hit', { key });
      return cached.value;
    }

    logger.debug('Cache miss', { key });
    const value = await computeFn();

    this.set(key, value);
    return value;
  }

  /**
   * Set cache value
   */
  set(key, value) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }
}

// Create singleton cache for book enrichment lookups
const enrichmentCache = new MemoCache(500, 3600000); // 1 hour TTL

module.exports = {
  ConcurrencyLimiter,
  enrichmentLimiter,
  processBatch,
  ConnectionPool,
  imageOptimization,
  streamCSV,
  MemoCache,
  enrichmentCache,
};
