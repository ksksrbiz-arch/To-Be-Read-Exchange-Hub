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
      return null;
    }

    const capacity = result.rows[0];
    const availableSpace = capacity.max_capacity - capacity.current_count;
    const utilization = (capacity.current_count / capacity.max_capacity) * 100;
    
    return {
      ...capacity,
      available_space: availableSpace,
      available: availableSpace,  // Alias for compatibility
      utilization: utilization,
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
     ON CONFLICT (shelf_location, section) DO UPDATE
     SET max_capacity = EXCLUDED.max_capacity
     RETURNING *`,
    [shelf, section, maxCapacity]
  );

  return result.rows[0];
}

/**
 * Update shelf count when books are added/removed
 */
async function updateShelfCount(shelf, section, delta) {
  await pool.query(
    `INSERT INTO shelf_capacity (shelf_location, section, current_count, max_capacity)
     VALUES ($1, $2, GREATEST(0, $3), 100)
     ON CONFLICT (shelf_location, section)
     DO UPDATE SET 
       current_count = GREATEST(0, shelf_capacity.current_count + $3),
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
    // Parse preferred shelf if it contains section (e.g., 'B-01')
    const [shelfPart, sectionPart] = preferredShelf.includes('-') 
      ? preferredShelf.split('-') 
      : [preferredShelf, null];
    
    const capacity = await getShelfCapacity(shelfPart, sectionPart);
    if (capacity && capacity.available_space > 0) {
      return {
        shelf_location: shelfPart,
        shelf: shelfPart,
        section: sectionPart || await getNextSection(shelfPart),
        placement_reason: 'manual_preference',
        utilization: capacity.utilization,
      };
    }
  }

  // Genre-based placement
  if (genre) {
    const genreShelf = await findGenreShelf(genre);
    if (genreShelf) {
      const capacity = await getShelfCapacity(genreShelf.shelf_location, genreShelf.section);
      if (capacity && capacity.available_space > 0) {
        return {
          shelf_location: genreShelf.shelf_location,
          shelf: genreShelf.shelf_location,
          section: genreShelf.section,
          placement_reason: 'genre_match',
          utilization: capacity.utilization,
        };
      }
    }
  }

  // Author alphabetical (fallback)
  const authorLetter = (author || 'Unknown').trim().charAt(0).toUpperCase();
  const shelf = (authorLetter >= 'A' && authorLetter <= 'Z') ? authorLetter : 'Z';
  
  const capacity = await getShelfCapacity(shelf);
  
  if (avoidFull && capacity && capacity.available_space === 0) {
    // Find nearest shelf with space
    return await findNearestAvailableShelf(shelf);
  }

  const section = await getNextSection(shelf);
  
  return {
    shelf_location: shelf,
    shelf: shelf,
    section: section,
    placement_reason: 'author_alpha',
    utilization: capacity ? capacity.utilization : 0,
  };
}

/**
 * Find genre-preferred shelf
 */
async function findGenreShelf(genre) {
  const result = await pool.query(
    `SELECT shelf_location, section, max_capacity, current_count, genre_preference
     FROM shelf_capacity 
     WHERE genre_preference = $1 
       AND current_count < max_capacity
     ORDER BY current_count ASC, shelf_location ASC, section ASC
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

  const nextNum = result.rows[0]?.next_section || 1;
  // Pad to 2 digits
  return String(nextNum).padStart(2, '0');
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
    const shelfLoc = result.rows[0].shelf_location;
    const section = await getNextSection(shelfLoc);
    const capacity = await getShelfCapacity(shelfLoc);
    return {
      shelf_location: shelfLoc,
      shelf: shelfLoc,
      section: section,
      placement_reason: 'overflow_nearest',
      utilization: capacity ? capacity.utilization : 0,
    };
  }

  // Fallback: create new overflow shelf
  await createShelfCapacity('OVERFLOW', '01', 200);
  
  return {
    shelf_location: 'OVERFLOW',
    shelf: 'OVERFLOW',
    section: '01',
    placement_reason: 'overflow_new',
    utilization: 0,
  };
}

/**
 * Get inventory status report
 */
async function getInventoryStatus() {
  const result = await pool.query(
    `SELECT 
      shelf_location as shelf,
      section,
      max_capacity,
      current_count,
      (current_count::FLOAT / NULLIF(max_capacity, 0) * 100) as utilization,
      (max_capacity - current_count) as available_space
     FROM shelf_capacity
     ORDER BY shelf_location, section`
  );

  return result.rows;
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
    query += ` AND ib.batch_id = $${params.length}`;
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
