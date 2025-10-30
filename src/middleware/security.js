const helmet = require('helmet');
const crypto = require('crypto');

/**
 * Enterprise security headers using Helmet
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://covers.openlibrary.org', 'https://books.google.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

/**
 * Optional API key authentication middleware
 * Enable by setting API_KEY_ENABLED=true in environment
 */
const apiKeyAuth = (req, res, next) => {
  // Skip if not enabled
  if (process.env.API_KEY_ENABLED !== 'true') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  const validApiKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);

  if (!apiKey) {
    req.log.warn({ path: req.path }, 'API key missing');
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Please provide X-API-Key header',
    });
  }

  // Constant-time comparison to prevent timing attacks

  let isValid = false;
  try {
    isValid = validApiKeys.some(validKey => {
      // Only compare if lengths match to avoid timingSafeEqual throw
      if (apiKey.length !== validKey.length) return false;
      return crypto.timingSafeEqual(
        Buffer.from(apiKey),
        Buffer.from(validKey)
      );
    });
  } catch (e) {
    // Defensive: treat any error as invalid
    isValid = false;
  }

  if (!isValid) {
    if (req.log && typeof req.log.warn === 'function') {
      req.log.warn({ path: req.path }, 'Invalid API key');
    }
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
};

/**
 * Request sanitization middleware
 * Prevents common injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove NULL bytes and control characters
      return obj.replace(/[\x00-\x1F\x7F]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = sanitize(value);
      }
      return cleaned;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

module.exports = {
  securityHeaders,
  apiKeyAuth,
  sanitizeInput,
};
