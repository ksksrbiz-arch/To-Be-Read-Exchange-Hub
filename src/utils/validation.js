const logger = require('../utils/logger');

/**
 * Validation utilities for batch upload system
 */

/**
 * Validate book data
 */
function validateBookData(book, rowNumber = null) {
  const errors = [];
  const prefix = rowNumber ? `Row ${rowNumber}: ` : '';

  // At least one identifier required
  if (!book.isbn && !book.upc && !book.asin && !book.title) {
    errors.push(`${prefix}At least one identifier (ISBN, UPC, ASIN, or title) is required`);
  }

  // ISBN validation
  if (book.isbn && !isValidISBN(book.isbn)) {
    errors.push(`${prefix}Invalid ISBN format: ${book.isbn}`);
  }

  // Quantity validation
  const qty = parseInt(book.quantity, 10);
  if (isNaN(qty) || qty < 1 || qty > 1000) {
    errors.push(`${prefix}Quantity must be between 1 and 1000, got: ${book.quantity}`);
  }

  // Condition validation
  const validConditions = ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Poor'];
  if (book.condition && !validConditions.includes(book.condition)) {
    errors.push(`${prefix}Invalid condition. Must be one of: ${validConditions.join(', ')}`);
  }

  // Title length
  if (book.title && book.title.length > 255) {
    errors.push(`${prefix}Title too long (max 255 characters)`);
  }

  // Author length
  if (book.author && book.author.length > 255) {
    errors.push(`${prefix}Author too long (max 255 characters)`);
  }

  return errors;
}

/**
 * Validate ISBN (ISBN-10 or ISBN-13)
 */
function isValidISBN(isbn) {
  // Remove hyphens and spaces
  const cleaned = isbn.replace(/[-\s]/g, '');

  if (cleaned.length === 10) {
    return isValidISBN10(cleaned);
  } else if (cleaned.length === 13) {
    return isValidISBN13(cleaned);
  }

  return false;
}

/**
 * Validate ISBN-10
 */
function isValidISBN10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn[i], 10) * (10 - i);
  }

  const lastChar = isbn[9];
  sum += lastChar === 'X' ? 10 : parseInt(lastChar, 10);

  return sum % 11 === 0;
}

/**
 * Validate ISBN-13
 */
function isValidISBN13(isbn) {
  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const multiplier = i % 2 === 0 ? 1 : 3;
    sum += parseInt(isbn[i], 10) * multiplier;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(isbn[12], 10);
}

/**
 * Validate batch size
 */
function validateBatchSize(books) {
  const errors = [];

  if (!Array.isArray(books)) {
    errors.push('Books must be an array');
    return errors;
  }

  if (books.length === 0) {
    errors.push('Batch is empty');
  }

  if (books.length > 1000) {
    errors.push(`Batch too large: ${books.length} books (max 1000)`);
  }

  return errors;
}

/**
 * Validate file upload
 */
function validateFileUpload(file) {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return errors;
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
  }

  // Check file type
  const allowedTypes = [
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`Invalid file type: ${file.mimetype}`);
  }

  return errors;
}

/**
 * Sanitize book data
 */
function sanitizeBookData(book) {
  return {
    isbn: book.isbn ? String(book.isbn).trim() : null,
    upc: book.upc ? String(book.upc).trim() : null,
    asin: book.asin ? String(book.asin).trim() : null,
    title: book.title ? String(book.title).trim().substring(0, 255) : null,
    author: book.author ? String(book.author).trim().substring(0, 255) : null,
    publisher: book.publisher ? String(book.publisher).trim().substring(0, 255) : null,
    description: book.description ? String(book.description).trim() : null,
    genre: book.genre ? String(book.genre).trim().substring(0, 100) : null,
    condition: book.condition ? String(book.condition).trim() : 'Good',
    quantity: parseInt(book.quantity || 1, 10),
    format: book.format ? String(book.format).trim() : null,
    shelf_location: book.shelf_location ? String(book.shelf_location).trim() : null,
  };
}

/**
 * Error response builder
 */
function buildErrorResponse(errors, context = {}) {
  logger.error('Validation errors', { errors, context });

  return {
    success: false,
    error: 'Validation failed',
    errors: errors.map(err => typeof err === 'string' ? { message: err } : err),
    context,
  };
}

/**
 * Rate limit check for batch operations
 */
function checkBatchRateLimit() {
  // Simple in-memory tracking
  // TODO: Implement Redis-based rate limiting when available
  return { allowed: true, remaining: 10 };
}

module.exports = {
  validateBookData,
  isValidISBN,
  validateBatchSize,
  validateFileUpload,
  sanitizeBookData,
  buildErrorResponse,
  checkBatchRateLimit,
};
