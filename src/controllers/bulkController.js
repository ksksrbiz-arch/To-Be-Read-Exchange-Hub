const pool = require('../config/database');
const { enrichBookData } = require('../services/enrichment');
const { determineStorageLocation } = require('../services/inventory');
const logger = require('../utils/logger');
const Papa = require('papaparse');

/**
 * Bulk import books from CSV or JSON
 * POST /api/books/bulk
 */
async function bulkImportBooks(req, res) {
  const client = await pool.connect();
  let books = [];

  try {
    // Parse input - CSV file or JSON array
    if (req.file) {
      // CSV upload via multer
      const csvText = req.file.buffer.toString('utf8');
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      });

      if (parsed.errors.length > 0) {
        return res.status(400).json({
          error: 'CSV parsing failed',
          details: parsed.errors.slice(0, 5), // First 5 errors
        });
      }

      books = parsed.data;
    } else if (req.body.books && Array.isArray(req.body.books)) {
      // JSON array
      books = req.body.books;
    } else {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Provide either a CSV file or JSON array of books',
      });
    }

    if (books.length === 0) {
      return res.status(400).json({ error: 'No books to import' });
    }

    if (books.length > 1000) {
      return res.status(400).json({
        error: 'Batch size too large',
        message: 'Maximum 1000 books per import',
      });
    }

    await client.query('BEGIN');

    const results = {
      total: books.length,
      successful: 0,
      failed: 0,
      errors: [],
      books: [],
    };

    for (let i = 0; i < books.length; i++) {
      const book = books[i];

      try {
        // Validate required fields
        if (!book.isbn && !book.title) {
          throw new Error('Either ISBN or title is required');
        }

        const quantity = parseInt(book.quantity, 10);
        if (isNaN(quantity) || quantity < 1) {
          throw new Error('Valid quantity (>=1) is required');
        }

        // Enrich if ISBN provided
        let enrichedData = {};
        if (book.isbn) {
          try {
            enrichedData = (await enrichBookData(book.isbn)) || {};
          } catch (enrichError) {
            logger.warn(`Enrichment failed for ISBN ${book.isbn}: ${enrichError.message}`);
          }
        }

        // Determine storage location
        const author = book.author || enrichedData.author || 'Unknown';
        const location = book.shelf_location
          ? {
              shelf: book.shelf_location.split('-')[0],
              section: book.shelf_location.split('-')[1] || '1',
            }
          : await determineStorageLocation(author);

        // Insert book
        const insertQuery = `
          INSERT INTO books (isbn, title, author, publisher, description, cover_url, shelf_location, section, quantity, available_quantity)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (isbn) DO UPDATE SET
            quantity = books.quantity + EXCLUDED.quantity,
            available_quantity = books.available_quantity + EXCLUDED.available_quantity,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const values = [
          book.isbn || null,
          book.title || enrichedData.title || 'Untitled',
          author,
          book.publisher || enrichedData.publisher || null,
          book.description || enrichedData.description || null,
          enrichedData.coverUrl || null,
          location.shelf,
          location.section,
          quantity,
          quantity,
        ];

        const result = await client.query(insertQuery, values);
        results.successful++;
        results.books.push(result.rows[0]);
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          book: { isbn: book.isbn, title: book.title },
          error: error.message,
        });
      }
    }

    await client.query('COMMIT');

    res.status(results.failed > 0 ? 207 : 201).json({
      success: results.failed === 0,
      message: `Imported ${results.successful} of ${results.total} books`,
      ...results,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Bulk import failed: %s', error.message);
    res.status(500).json({
      error: 'Bulk import failed',
      message: error.message,
    });
  } finally {
    client.release();
  }
}

/**
 * Bulk update books
 * PUT /api/books/bulk
 */
async function bulkUpdateBooks(req, res) {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Provide an array of updates with {id, fields}',
    });
  }

  if (updates.length > 500) {
    return res.status(400).json({
      error: 'Batch size too large',
      message: 'Maximum 500 updates per request',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results = {
      total: updates.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];

      try {
        if (!update.id || !update.fields) {
          throw new Error('Each update must have id and fields');
        }

        const allowedFields = [
          'title',
          'author',
          'publisher',
          'description',
          'shelf_location',
          'section',
          'quantity',
          'available_quantity',
        ];
        const fields = Object.keys(update.fields).filter((f) => allowedFields.includes(f));

        if (fields.length === 0) {
          throw new Error('No valid fields to update');
        }

        const setClauses = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');
        const values = [update.id, ...fields.map((f) => update.fields[f])];

        const updateQuery = `
          UPDATE books
          SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `;

        const result = await client.query(updateQuery, values);

        if (result.rowCount === 0) {
          throw new Error(`Book with id ${update.id} not found`);
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          id: update.id,
          error: error.message,
        });
      }
    }

    await client.query('COMMIT');

    res.status(results.failed > 0 ? 207 : 200).json({
      success: results.failed === 0,
      message: `Updated ${results.successful} of ${results.total} books`,
      ...results,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Bulk update failed: %s', error.message);
    res.status(500).json({
      error: 'Bulk update failed',
      message: error.message,
    });
  } finally {
    client.release();
  }
}

/**
 * Bulk delete books
 * DELETE /api/books/bulk
 */
async function bulkDeleteBooks(req, res) {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Provide an array of book IDs',
    });
  }

  if (ids.length > 500) {
    return res.status(400).json({
      error: 'Batch size too large',
      message: 'Maximum 500 deletions per request',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const placeholders = ids.map((_, idx) => `$${idx + 1}`).join(', ');
    const deleteQuery = `DELETE FROM books WHERE id IN (${placeholders}) RETURNING id`;

    const result = await client.query(deleteQuery, ids);

    await client.query('COMMIT');

    const deletedIds = result.rows.map((r) => r.id);
    const notFound = ids.filter((id) => !deletedIds.includes(id));

    res.json({
      success: true,
      message: `Deleted ${result.rowCount} of ${ids.length} books`,
      deleted: result.rowCount,
      total: ids.length,
      notFound: notFound.length > 0 ? notFound : undefined,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Bulk delete failed: %s', error.message);
    res.status(500).json({
      error: 'Bulk delete failed',
      message: error.message,
    });
  } finally {
    client.release();
  }
}

module.exports = {
  bulkImportBooks,
  bulkUpdateBooks,
  bulkDeleteBooks,
};
