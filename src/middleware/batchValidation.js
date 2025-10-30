const {
  validateBookData,
  validateBatchSize,
  validateFileUpload,
  sanitizeBookData,
  buildErrorResponse,
} = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Middleware to validate batch upload request
 */
function validateBatchUpload(req, res, next) {
  try {
    const uploadedFiles = {
      manifest: req.files?.manifest?.[0],
      images: req.files?.images || [],
    };

    // Validate manifest file presence
    if (!uploadedFiles.manifest) {
      return res.status(400).json(buildErrorResponse(['Manifest file is required']));
    }

    // Validate manifest file type and size
    const manifestValidation = validateFileUpload(uploadedFiles.manifest);
    if (manifestValidation.length > 0) {
      logger.warn('Manifest validation failed', { errors: manifestValidation });
      return res.status(400).json(buildErrorResponse(manifestValidation));
    }

    // Validate image files
    for (const imageFile of uploadedFiles.images) {
      const imageValidation = validateFileUpload(imageFile);
      if (imageValidation.length > 0) {
        logger.warn('Image validation failed', { file: imageFile.originalname, errors: imageValidation });
        return res.status(400).json(
          buildErrorResponse(imageValidation, { file: imageFile.originalname })
        );
      }
    }

    // Attach validated files for downstream processing
    req.validatedFiles = uploadedFiles;
    next();
  } catch (error) {
    logger.error('Batch validation middleware error', { error: error.message });
    res.status(500).json(buildErrorResponse(['Validation failed due to server error']));
  }
}

/**
 * Middleware to validate and sanitize parsed books
 */
function validateBooks(books) {
  const validationErrors = [];
  const sanitizedBooks = [];

  // Validate batch size
  const batchSizeErrors = validateBatchSize(books);
  if (batchSizeErrors.length > 0) {
    return { errors: batchSizeErrors, sanitized: [] };
  }

  // Validate and sanitize each book
  books.forEach((book, index) => {
    const rowNumber = index + 2; // Account for CSV header row
    const errors = validateBookData(book, rowNumber);

    if (errors.length > 0) {
      validationErrors.push(...errors.map(err => ({
        row: rowNumber,
        error: err,
        isbn: book.isbn || null,
      })));
    } else {
      sanitizedBooks.push(sanitizeBookData(book));
    }
  });

  return {
    errors: validationErrors,
    sanitized: sanitizedBooks,
  };
}

/**
 * AI enrichment retry logic with exponential backoff
 */
async function enrichWithRetry(enrichFunction, bookData, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await enrichFunction(bookData);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
      logger.warn('Enrichment attempt failed', {
        attempt,
        maxRetries,
        error: error.message,
        isbn: bookData.isbn,
      });

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  logger.error('Enrichment failed after all retries', {
    isbn: bookData.isbn,
    error: lastError?.message,
  });

  // Return graceful degradation - use provided data
  return {
    ...bookData,
    enrichment_status: 'failed',
    enrichment_error: lastError?.message || 'All enrichment attempts failed',
  };
}

/**
 * Sanitize error for user display
 */
function sanitizeError(error) {
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    return 'An internal error occurred';
  }
  return error.message || 'Unknown error';
}

/**
 * Format validation errors for response
 */
function formatValidationErrors(errors) {
  return errors.map(err => {
    if (typeof err === 'string') {
      return { message: err };
    }
    return {
      row: err.row || null,
      message: err.error || err.message,
      isbn: err.isbn || null,
    };
  });
}

module.exports = {
  validateBatchUpload,
  validateBooks,
  enrichWithRetry,
  sanitizeError,
  formatValidationErrors,
};
