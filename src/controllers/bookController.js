const pool = require('../config/database');
const { enrichBookData } = require('../services/enrichment');
const { determineStorageLocation } = require('../services/inventory');

/**
 * Create a new book with smart inventory logic and data enrichment
 */
async function createBook(req, res) {
  const { isbn, title, author, quantity, shelf_location } = req.body;

  if (!isbn && !title) {
    return res.status(400).json({ error: 'Either ISBN or title is required' });
  }

  try {
    // Enrich book data if ISBN is provided
    let bookData = { isbn, title, author };

    if (isbn) {
      // enrichment can return null when APIs fail — guard against that
      const enrichedData = (await enrichBookData(isbn)) || {};
      bookData = {
        ...bookData,
        title: bookData.title || enrichedData.title || null,
        author: bookData.author || enrichedData.author || null,
        publisher: enrichedData.publisher || null,
        description: enrichedData.description || null,
        cover_url: enrichedData.cover_url || null,
      };
    }

    // Determine storage location using smart inventory logic
    const location = await determineStorageLocation(bookData, shelf_location);

    // Insert book into database
    const result = await pool.query(
      `INSERT INTO books (isbn, title, author, publisher, description, cover_url, shelf_location, section, quantity, available_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (isbn) 
       DO UPDATE SET 
         quantity = books.quantity + EXCLUDED.quantity,
         available_quantity = books.available_quantity + EXCLUDED.available_quantity,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        bookData.isbn,
        bookData.title,
        bookData.author,
        bookData.publisher,
        bookData.description,
        bookData.cover_url,
        location.shelf_location,
        location.section,
        quantity || 1,
      ]
    );

    res.status(201).json({
      success: true,
      book: result.rows[0],
    });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error creating book: %s', error);
    res.status(500).json({ error: 'Failed to create book', message: error.message });
  }
}

/**
 * Get all books
 */
async function getBooks(req, res) {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
    res.json({ success: true, books: result.rows });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error fetching books: %s', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
}

/**
 * Get a single book by ID
 */
async function getBookById(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ success: true, book: result.rows[0] });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error fetching book: %s', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
}

/**
 * Update a book
 */
async function updateBook(req, res) {
  const { id } = req.params;
  const updates = req.body;

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
  const fields = Object.keys(updates).filter((key) => allowedFields.includes(key));

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
  const values = [id, ...fields.map((field) => updates[field])];

  try {
    const result = await pool.query(
      `UPDATE books SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ success: true, book: result.rows[0] });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error updating book: %s', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
}

/**
 * Delete a book
 */
async function deleteBook(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error deleting book: %s', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
}

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
};
