const { body, param, validationResult } = require('express-validator');

// Shared handler to return 400 on validation problems
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation error', details: errors.array() });
  }
  next();
}

// POST /api/books
const validateCreateBook = [
  body('isbn').optional().isString().withMessage('isbn must be a string'),
  body('title').optional().isString().withMessage('title must be a string'),
  body('author').optional().isString().withMessage('author must be a string'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
  body('shelf_location').optional().isString().withMessage('shelf_location must be a string'),
  handleValidationErrors
];

// PUT /api/books/:id
const validateUpdateBook = [
  param('id').isInt().withMessage('id must be an integer'),
  body('title').optional().isString(),
  body('author').optional().isString(),
  body('publisher').optional().isString(),
  body('description').optional().isString(),
  body('shelf_location').optional().isString(),
  body('section').optional().isString(),
  body('quantity').optional().isInt(),
  body('available_quantity').optional().isInt(),
  handleValidationErrors
];

// POST /api/sync/pingo
const validateSyncPingo = [
  // Note: presence of books array is checked by controller to keep same error message
  body('books').optional().isArray().withMessage('books must be an array'),
  body('books.*.isbn').optional().isString(),
  body('books.*.title').optional().isString(),
  body('books.*.author').optional().isString(),
  body('books.*.quantity').optional().isInt({ min: 1 }),
  handleValidationErrors
];

module.exports = {
  validateCreateBook,
  validateUpdateBook,
  validateSyncPingo,
  handleValidationErrors
};
