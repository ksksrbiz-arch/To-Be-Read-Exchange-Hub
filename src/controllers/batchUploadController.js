const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../config/database');
const { enrichBookData } = require('../services/enrichment');
const { findOptimalShelf, updateShelfCount } = require('../services/inventoryTracking');
const logger = require('../utils/logger');
const Papa = require('papaparse');

// Configure multer for file uploads (CSV + images)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      logger.error(`Failed to create upload directory: ${err.message}`);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|json|jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only CSV, JSON, and images allowed.'));
  },
});

/**
 * Enhanced batch upload with image handling and AI enrichment
 * POST /api/books/batch-upload
 */
async function batchUploadBooks(req, res) {
  const client = await pool.connect();
  let batchId;

  try {
    await client.query('BEGIN');

    // Create batch upload record
    const batchResult = await client.query(
      `INSERT INTO batch_uploads (user_id, filename, status)
       VALUES ($1, $2, 'processing')
       RETURNING id`,
      [req.user?.id || null, req.files?.manifest?.[0]?.originalname || 'direct_input']
    );
    batchId = batchResult.rows[0].id;

    let books = [];

    // Parse manifest (CSV or JSON)
    if (req.files?.manifest) {
      const manifestFile = req.files.manifest[0];
      
      if (path.extname(manifestFile.originalname).toLowerCase() === '.csv') {
        const csvText = await fs.readFile(manifestFile.path, 'utf8');
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });

        if (parsed.errors.length > 0) {
          throw new Error(`CSV parsing failed: ${parsed.errors[0].message}`);
        }

        books = parsed.data;
      } else if (path.extname(manifestFile.originalname).toLowerCase() === '.json') {
        const jsonText = await fs.readFile(manifestFile.path, 'utf8');
        books = JSON.parse(jsonText);
      }
    } else if (req.body.books) {
      books = Array.isArray(req.body.books) ? req.body.books : [req.body.books];
    } else {
      throw new Error('No book data provided');
    }

    if (books.length === 0) {
      throw new Error('Empty batch upload');
    }

    if (books.length > 1000) {
      throw new Error('Batch too large (max 1000 books)');
    }

    await client.query(
      'UPDATE batch_uploads SET total_books = $1 WHERE id = $2',
      [books.length, batchId]
    );

    // Map uploaded images to books (if provided)
    const imageMap = {};
    if (req.files?.images) {
      req.files.images.forEach(img => {
        // Extract book identifier from filename (e.g., "isbn_9780123456789.jpg" or "1.jpg")
        const match = img.originalname.match(/^(?:isbn_)?([^.]+)/);
        if (match) {
          imageMap[match[1]] = img.path;
        }
      });
    }

    const results = {
      batch_id: batchId,
      total: books.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Queue books for processing
    for (let i = 0; i < books.length; i++) {
      const book = books[i];

      try {
        // Validate
        if (!book.isbn && !book.upc && !book.asin && !book.title) {
          throw new Error('At least one identifier (ISBN/UPC/ASIN/title) required');
        }

        const quantity = parseInt(book.quantity || 1, 10);
        if (isNaN(quantity) || quantity < 1) {
          throw new Error('Invalid quantity');
        }

        // Find matching user image
        const userImage = imageMap[book.isbn] || imageMap[book.upc] || imageMap[String(i)] || null;

        // Insert into incoming queue
        await client.query(
          `INSERT INTO incoming_books (
            batch_id, raw_data, isbn, upc, asin, title, author, condition, quantity, user_image_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            batchId,
            JSON.stringify(book),
            book.isbn || null,
            book.upc || null,
            book.asin || null,
            book.title || null,
            book.author || null,
            book.condition || 'Good',
            quantity,
            userImage,
          ]
        );

        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          book: { isbn: book.isbn, title: book.title },
          error: error.message,
        });
      }
    }

    await client.query(
      `UPDATE batch_uploads 
       SET processed_books = $1, successful_books = $2, failed_books = $3, error_log = $4
       WHERE id = $5`,
      [results.processed, results.processed - results.failed, results.failed, JSON.stringify(results.errors), batchId]
    );

    await client.query('COMMIT');

    // Start background processing (async)
    processBatch(batchId).catch(err => {
      logger.error(`Background batch processing failed for batch ${batchId}: ${err.message}`);
    });

    res.status(202).json({
      success: true,
      message: 'Batch queued for processing',
      ...results,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Batch upload failed: ${error.message}`);
    res.status(400).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
}

/**
 * Background batch processor
 */
async function processBatch(batchId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get pending books
    const pending = await client.query(
      'SELECT * FROM incoming_books WHERE batch_id = $1 AND processing_status = $2 ORDER BY id',
      [batchId, 'pending']
    );

    let successful = 0;
    let failed = 0;

    for (const incomingBook of pending.rows) {
      try {
        // Enrich metadata
        const enrichmentOptions = {
          title: incomingBook.title,
          author: incomingBook.author,
          upc: incomingBook.upc,
          asin: incomingBook.asin,
        };

        let enrichedData = { isbn: incomingBook.isbn };

        if (incomingBook.isbn || incomingBook.title) {
          enrichedData = await enrichBookData(incomingBook.isbn, enrichmentOptions);
        }

        // Determine shelf placement
        const placement = await findOptimalShelf({
          author: enrichedData.author || incomingBook.author,
          genre: enrichedData.genre,
        });

        // Insert book
        await client.query(
          `INSERT INTO books (
            isbn, upc, asin, title, author, publisher, description, genre, pages, format,
            cover_url, user_image_url, condition, shelf_location, section, quantity, available_quantity,
            enrichment_source, enrichment_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16, $17, 'completed')
           ON CONFLICT (isbn) 
           DO UPDATE SET 
             quantity = books.quantity + EXCLUDED.quantity,
             available_quantity = books.available_quantity + EXCLUDED.available_quantity,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [
            incomingBook.isbn,
            incomingBook.upc,
            incomingBook.asin,
            enrichedData.title || incomingBook.title,
            enrichedData.author || incomingBook.author,
            enrichedData.publisher,
            enrichedData.description,
            enrichedData.genre,
            enrichedData.pages,
            enrichedData.format,
            enrichedData.cover_url,
            incomingBook.user_image_path,
            incomingBook.condition,
            placement.shelf_location,
            placement.section,
            incomingBook.quantity,
            enrichedData.enrichment_source || 'api',
          ]
        );

        // Update shelf capacity
        await updateShelfCount(placement.shelf_location, placement.section, incomingBook.quantity);

        // Mark as processed
        await client.query(
          'UPDATE incoming_books SET processing_status = $1, assigned_shelf = $2, assigned_section = $3, processed_at = CURRENT_TIMESTAMP WHERE id = $4',
          ['completed', placement.shelf_location, placement.section, incomingBook.id]
        );

        successful++;
      } catch (error) {
        logger.error(`Failed to process incoming book ${incomingBook.id}: ${error.message}`);
        
        await client.query(
          'UPDATE incoming_books SET processing_status = $1, error_message = $2, enrichment_attempts = enrichment_attempts + 1 WHERE id = $3',
          ['failed', error.message, incomingBook.id]
        );

        failed++;
      }
    }

    // Update batch status
    await client.query(
      `UPDATE batch_uploads 
       SET status = 'completed', successful_books = $1, failed_books = $2, completed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [successful, failed, batchId]
    );

    await client.query('COMMIT');
    logger.info(`Batch ${batchId} processing complete: ${successful} successful, ${failed} failed`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Batch ${batchId} processing failed: ${error.message}`);

    await pool.query(
      'UPDATE batch_uploads SET status = $1, error_log = $2 WHERE id = $3',
      ['failed', JSON.stringify({ error: error.message }), batchId]
    );
  } finally {
    client.release();
  }
}

/**
 * Get batch status
 * GET /api/books/batch/:id
 */
async function getBatchStatus(req, res) {
  const { id } = req.params;

  try {
    const batchResult = await pool.query(
      'SELECT * FROM batch_uploads WHERE id = $1',
      [id]
    );

    if (batchResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const batch = batchResult.rows[0];

    const queueResult = await pool.query(
      `SELECT processing_status, COUNT(*) as count
       FROM incoming_books
       WHERE batch_id = $1
       GROUP BY processing_status`,
      [id]
    );

    const statusCounts = {};
    queueResult.rows.forEach(row => {
      statusCounts[row.processing_status] = parseInt(row.count, 10);
    });

    res.json({
      success: true,
      batch: {
        ...batch,
        queue_status: statusCounts,
        progress: batch.total_books > 0
          ? ((statusCounts.completed || 0) + (statusCounts.failed || 0)) / batch.total_books * 100
          : 0,
      },
    });
  } catch (error) {
    logger.error(`Error fetching batch status: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch batch status' });
  }
}

module.exports = {
  upload,
  batchUploadBooks,
  getBatchStatus,
  processBatch,
};
