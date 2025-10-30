const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Enhanced inventory service with capacity tracking and intelligent placement
 */

/**
 * Get shelf capacity and current usage
 * @param {string} shelf - Shelf location
 * @param {string} section - Section (optional)
 * @returns {Promise<Object>} - Capacity info
 */
async function getShelfCapacity(shelf, section = null) {
  try {
    const query = section
      ? 'SELECT * FROM shelf_capacity WHERE shelf_location = $1 AND section = $2'
      : 'SELECT * FROM shelf_capacity WHERE shelf_location = $1';
    
    const params = section ? [shelf, section] : [shelf];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      // Create default capacity entry
      return await createShelfCapacity(shelf, section);
    }

    const capacity = result.rows[0];
    return {
      ...capacity,
      available_space: capacity.max_capacity - capacity.current_count,
      utilization: (capacity.current_count / capacity.max_capacity) * 100,
    };
  } catch (error) {
    logger.error(`Error getting shelf capacity: ${error.message}`);
    throw error;
  }
}

/**
 * Create shelf capacity entry
 */
async function createShelfCapacity(shelf, section = null, maxCapacity = 100) {
  const result = await pool.query(
    `INSERT INTO shelf_capacity (shelf_location, section, max_capacity, current_count)
     VALUES ($1, $2, $3, 0)
     ON CONFLICT (shelf_location, section) DO NOTHING
     RETURNING *`,
    [shelf, section, maxCapacity]
  );

  return result.rows[0] || await getShelfCapacity(shelf, section);
}

/**
 * Update shelf count when books are added/removed
 */
async function updateShelfCount(shelf, section, delta) {
  await pool.query(
    `INSERT INTO shelf_capacity (shelf_location, section, current_count)
     VALUES ($1, $2, $3)
     ON CONFLICT (shelf_location, section)
     DO UPDATE SET 
       current_count = shelf_capacity.current_count + $3,
       updated_at = CURRENT_TIMESTAMP`,
    [shelf, section, delta]
  );
}

/**
 * Find optimal shelf location with multi-criteria logic
 * @param {Object} bookData - Book metadata
 * @param {Object} options - Placement preferences
 * @returns {Promise<Object>} - Shelf assignment
 */
async function findOptimalShelf(bookData, options = {}) {
  const { author, genre } = bookData;
  const { preferredShelf, avoidFull = true } = options;

  // Priority order:
  // 1. Preferred shelf (if specified and has space)
  // 2. Genre-based placement
  // 3. Author alphabetical placement
  // 4. First available space

  if (preferredShelf) {
    const capacity = await getShelfCapacity(preferredShelf);
    if (capacity.available_space > 0) {
      return {
        shelf_location: preferredShelf,
        section: await getNextSection(preferredShelf),
        placement_reason: 'manual_preference',
      };
    }
  }

  // Genre-based placement
  if (genre) {
    const genreShelf = await findGenreShelf(genre);
    if (genreShelf) {
      const capacity = await getShelfCapacity(genreShelf.shelf_location);
      if (capacity.available_space > 0) {
        return {
          shelf_location: genreShelf.shelf_location,
          section: await getNextSection(genreShelf.shelf_location),
          placement_reason: 'genre_match',
        };
      }
    }
  }

  // Author alphabetical (fallback)
  const authorLetter = (author || 'Unknown').trim().charAt(0).toUpperCase();
  const shelf = (authorLetter >= 'A' && authorLetter <= 'Z') ? authorLetter : 'Z';
  
  const capacity = await getShelfCapacity(shelf);
  
  if (avoidFull && capacity.available_space === 0) {
    // Find nearest shelf with space
    return await findNearestAvailableShelf(shelf);
  }

  return {
    shelf_location: shelf,
    section: await getNextSection(shelf),
    placement_reason: 'author_alpha',
  };
}

/**
 * Find genre-preferred shelf
 */
async function findGenreShelf(genre) {
  const result = await pool.query(
    `SELECT * FROM shelf_capacity 
     WHERE genre_preference = $1 
     ORDER BY current_count ASC 
     LIMIT 1`,
    [genre]
  );

  return result.rows[0] || null;
}

/**
 * Get next available section in a shelf
 */
async function getNextSection(shelf) {
  const result = await pool.query(
    // eslint-disable-next-line quotes
    "SELECT COALESCE(MAX(CAST(section AS INTEGER)), 0) + 1 as next_section FROM books WHERE shelf_location = $1 AND section ~ '^[0-9]+$'",
    [shelf]
  );

  return String(result.rows[0]?.next_section || '1');
}

/**
 * Find nearest shelf with available space
 */
async function findNearestAvailableShelf(targetShelf) {
  const result = await pool.query(
    `SELECT shelf_location, section, (max_capacity - current_count) as available
     FROM shelf_capacity
     WHERE (max_capacity - current_count) > 0
     ORDER BY ABS(ASCII($1) - ASCII(shelf_location)), available DESC
     LIMIT 1`,
    [targetShelf]
  );

  if (result.rows.length > 0) {
    return {
      shelf_location: result.rows[0].shelf_location,
      section: await getNextSection(result.rows[0].shelf_location),
      placement_reason: 'overflow_nearest',
    };
  }

  // Fallback: create new overflow shelf
  const overflowShelf = `${targetShelf}-OVERFLOW`;
  await createShelfCapacity(overflowShelf, '1', 200);
  
  return {
    shelf_location: overflowShelf,
    section: '1',
    placement_reason: 'overflow_new',
  };
}

/**
 * Get inventory status report
 */
async function getInventoryStatus() {
  const totalResult = await pool.query(
    `SELECT 
      COUNT(*) as total_books,
      SUM(quantity) as total_copies,
      SUM(available_quantity) as available_copies
     FROM books`
  );

  const shelfResult = await pool.query(
    `SELECT 
      shelf_location,
      SUM(current_count) as book_count,
      SUM(max_capacity) as total_capacity,
      AVG((current_count::FLOAT / NULLIF(max_capacity, 0)) * 100) as avg_utilization
     FROM shelf_capacity
     GROUP BY shelf_location
     ORDER BY shelf_location`
  );

  const overCapacity = await pool.query(
    `SELECT shelf_location, section, current_count, max_capacity
     FROM shelf_capacity
     WHERE current_count > max_capacity`
  );

  return {
    totals: totalResult.rows[0],
    shelves: shelfResult.rows,
    over_capacity: overCapacity.rows,
    alerts: {
      over_capacity_count: overCapacity.rows.length,
      needs_attention: overCapacity.rows.length > 0,
    },
  };
}

/**
 * Get incoming queue status
 */
async function getIncomingQueue(filters = {}) {
  let query = `
    SELECT 
      ib.*,
      bu.filename,
      bu.status as batch_status
    FROM incoming_books ib
    LEFT JOIN batch_uploads bu ON ib.batch_id = bu.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    query += ` AND ib.processing_status = $${params.length}`;
  }

  if (filters.batch_id) {
    params.push(filters.batch_id);
    query += ' AND ib.batch_id = $${params.length}';
  }

  query += ' ORDER BY ib.created_at ASC';

  if (filters.limit) {
    params.push(filters.limit);
    query += ` LIMIT $${params.length}`;
  }

  const result = await pool.query(query, params);
  return result.rows;
}

module.exports = {
  getShelfCapacity,
  createShelfCapacity,
  updateShelfCount,
  findOptimalShelf,
  getNextSection,
  getInventoryStatus,
  getIncomingQueue,
};
