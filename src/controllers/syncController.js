const pool = require('../config/database');
const { enrichBookData } = require('../services/enrichment');
const { determineStorageLocation } = require('../services/inventory');

/**
 * Sync Pingo inventory data
 * Expected format: Array of books with ISBN, title, author, quantity, etc.
 */
async function syncPingoInventory(req, res) {
  const { books } = req.body;

  if (!books || !Array.isArray(books)) {
    return res.status(400).json({ error: 'Invalid request: books array is required' });
  }

  const client = await pool.connect();
  let booksSynced = 0;
  const errors = [];

  try {
    await client.query('BEGIN');

    for (const pingoBook of books) {
      try {
        const { isbn, title, author, quantity } = pingoBook;

        if (!isbn && !title) {
          errors.push({ book: pingoBook, error: 'ISBN or title required' });
          continue;
        }

        // Enrich book data
        let bookData = { isbn, title, author };
        
        if (isbn) {
          const enrichedData = await enrichBookData(isbn);
          bookData = {
            ...bookData,
            title: bookData.title || enrichedData.title,
            author: bookData.author || enrichedData.author,
            publisher: enrichedData.publisher,
            description: enrichedData.description,
            cover_url: enrichedData.cover_url
          };
        }

        // Determine storage location
        const location = await determineStorageLocation(bookData);

        // Insert or update book
        await client.query(
          `INSERT INTO books (isbn, title, author, publisher, description, cover_url, shelf_location, section, quantity, available_quantity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
           ON CONFLICT (isbn) 
           DO UPDATE SET 
             quantity = books.quantity + EXCLUDED.quantity,
             available_quantity = books.available_quantity + EXCLUDED.available_quantity,
             title = COALESCE(EXCLUDED.title, books.title),
             author = COALESCE(EXCLUDED.author, books.author),
             publisher = COALESCE(EXCLUDED.publisher, books.publisher),
             description = COALESCE(EXCLUDED.description, books.description),
             cover_url = COALESCE(EXCLUDED.cover_url, books.cover_url),
             updated_at = CURRENT_TIMESTAMP`,
          [
            bookData.isbn,
            bookData.title,
            bookData.author,
            bookData.publisher,
            bookData.description,
            bookData.cover_url,
            location.shelf_location,
            location.section,
            quantity || 1
          ]
        );

        booksSynced++;
      } catch (error) {
        console.error('Error syncing book:', error);
        errors.push({ book: pingoBook, error: error.message });
      }
    }

    // Log the sync operation
    await client.query(
      `INSERT INTO pingo_sync_log (books_synced, status, error_message)
       VALUES ($1, $2, $3)`,
      [booksSynced, errors.length > 0 ? 'partial' : 'success', errors.length > 0 ? JSON.stringify(errors) : null]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      booksSynced,
      totalBooks: books.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error syncing Pingo inventory:', error);

    // Log the failed sync
    try {
      await pool.query(
        `INSERT INTO pingo_sync_log (books_synced, status, error_message)
         VALUES ($1, $2, $3)`,
        [0, 'failed', error.message]
      );
    } catch (logError) {
      console.error('Error logging sync failure:', logError);
    }

    res.status(500).json({ error: 'Failed to sync Pingo inventory', message: error.message });
  } finally {
    client.release();
  }
}

/**
 * Get Pingo sync history
 */
async function getSyncHistory(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM pingo_sync_log ORDER BY sync_date DESC LIMIT 50'
    );
    res.json({ success: true, syncHistory: result.rows });
  } catch (error) {
    console.error('Error fetching sync history:', error);
    res.status(500).json({ error: 'Failed to fetch sync history' });
  }
}

module.exports = {
  syncPingoInventory,
  getSyncHistory
};
