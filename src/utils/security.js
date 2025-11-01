const logger = require('../utils/logger');

/**
 * Security utilities for batch upload system
 */

/**
 * Validate file magic numbers (file signature)
 * Prevents malicious files disguised with wrong extensions
 */
function validateFileMagicNumber(buffer, mimetype) {
  if (!buffer || buffer.length < 3) {
    return false;
  }

  // Check magic numbers for common file types
  const signatures = {
    // JPEG
    'image/jpeg': [
      [0xFF, 0xD8, 0xFF, 0xE0], // JFIF
      [0xFF, 0xD8, 0xFF, 0xE1], // Exif
      [0xFF, 0xD8, 0xFF, 0xDB], // JPEG raw
    ],
    // PNG
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    // WebP
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // "RIFF" at start, "WEBP" at offset 8
    // CSV (text file - starts with printable ASCII)
    'text/csv': null, // Will validate differently
    // JSON (starts with { or [)
    'application/json': null, // Will validate differently
  };

  // Special handling for text files
  if (mimetype === 'text/csv' || mimetype === 'application/json') {
    // Check if first bytes are printable ASCII or UTF-8 BOM
    const firstByte = buffer[0];
    
    // UTF-8 BOM
    if (firstByte === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return true;
    }

    // Printable ASCII (space to ~) or common punctuation
    if ((firstByte >= 0x20 && firstByte <= 0x7E) ||
        firstByte === 0x09 || // tab
        firstByte === 0x0A || // newline
        firstByte === 0x0D) { // carriage return
      return true;
    }

    return false;
  }

  const expectedSignatures = signatures[mimetype];
  if (!expectedSignatures) {
    logger.warn('Unknown MIME type for magic number validation', { mimetype });
    return false;
  }

  // Check if buffer starts with any of the expected signatures
  return expectedSignatures.some(signature => {
    // Only check if buffer is long enough for this signature
    if (buffer.length < signature.length) {
      return false;
    }
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Sanitize CSV content to prevent injection attacks
 */
function sanitizeCSVContent(content) {
  const lines = content.split('\n');
  const sanitizedLines = lines.map(line => {
    // Remove any formula injection attempts
    // CSV formulas start with =, +, -, @, |, %
    const cells = line.split(',');
    const sanitizedCells = cells.map(cell => {
      let sanitized = cell.trim();

      // If cell starts with dangerous characters, prepend single quote
      if (sanitized.match(/^[=+\-@|%]/)) {
        logger.warn('Potential CSV injection detected', { cell: sanitized });
        sanitized = `'${sanitized}`;
      }

      return sanitized;
    });

    return sanitizedCells.join(',');
  });

  return sanitizedLines.join('\n');
}

/**
 * Rate limiter for batch uploads (in-memory)
 * In production, use Redis for distributed rate limiting
 */
class BatchRateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // userId -> [timestamps]
  }

  /**
   * Check if request is allowed
   */
  checkLimit(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove expired timestamps
    const validRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      retryAfter: 0,
    };
  }

  /**
   * Clear rate limit for user (for testing)
   */
  clear(userId) {
    this.requests.delete(userId);
  }

  /**
   * Clear all rate limits
   */
  reset() {
    this.requests.clear();
  }
}

// Create singleton instance
// 10 batch uploads per minute per user
const batchRateLimiter = new BatchRateLimiter(10, 60000);

/**
 * Middleware to enforce batch upload rate limiting
 */
function batchRateLimitMiddleware(req, res, next) {
  const userId = req.user?.id || req.ip; // Fallback to IP if no user

  const limit = batchRateLimiter.checkLimit(userId);

  // Set rate limit headers
  res.set('X-RateLimit-Limit', batchRateLimiter.maxRequests);
  res.set('X-RateLimit-Remaining', limit.remaining);

  if (!limit.allowed) {
    res.set('Retry-After', limit.retryAfter);
    logger.warn('Batch upload rate limit exceeded', {
      userId,
      retryAfter: limit.retryAfter,
    });

    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many batch uploads. Please try again in ${limit.retryAfter} seconds.`,
      retryAfter: limit.retryAfter,
    });
  }

  next();
}

/**
 * Validate API key format and strength
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // API key should be at least 32 characters
  if (apiKey.length < 32) {
    return false;
  }

  // Should be alphanumeric with possible hyphens/underscores
  if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
    return false;
  }

  return true;
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitizeFilename(filename) {
  // Remove directory traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit to safe characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure not empty
  if (!sanitized) {
    sanitized = `file_${Date.now()}`;
  }

  return sanitized;
}

/**
 * Validate file size
 */
function validateFileSize(size, maxSize = 10 * 1024 * 1024) {
  if (typeof size !== 'number' || size < 0) {
    return { valid: false, error: 'Invalid file size' };
  }

  if (size === 0) {
    return { valid: false, error: 'Empty file' };
  }

  if (size > maxSize) {
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    const actualMB = (size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File too large: ${actualMB}MB (max ${maxMB}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Detect and prevent SQL injection in string inputs
 */
function detectSQLInjection(input) {
  if (typeof input !== 'string') {
    return false;
  }

  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

module.exports = {
  validateFileMagicNumber,
  sanitizeCSVContent,
  batchRateLimiter,
  batchRateLimitMiddleware,
  validateApiKey,
  sanitizeFilename,
  validateFileSize,
  detectSQLInjection,
};
