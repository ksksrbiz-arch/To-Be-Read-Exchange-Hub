const pool = require('../config/database');

/**
 * Smart inventory logic to determine optimal storage location
 * @param {Object} bookData - Book data including title, author, etc.
 * @param {string} manualLocation - Optional manual shelf/section override
 * @returns {Promise<Object>} - Storage location details
 */
async function determineStorageLocation(bookData, manualLocation = null) {
  // If manual location is provided, use it
  if (manualLocation) {
    const [shelf, section] = parseLocation(manualLocation);
    return { shelf_location: shelf, section: section };
  }

  // Smart logic: determine based on genre, availability, or other factors
  // For now, we'll use a simple algorithm based on author's last name
  const location = await calculateOptimalLocation(bookData);
  return location;
}

/**
 * Parse manual location string into shelf and section
 * @param {string} locationString - Location string (e.g., "A-12" or "Shelf A, Section 12")
 * @returns {Array} - [shelf, section]
 */
function parseLocation(locationString) {
  if (!locationString) {
    return [null, null];
  }

  // Try to parse formats like "A-12", "a-12", "Shelf A", "Section 12", etc.
  const dashFormat = locationString.match(/^([A-Za-z]+)-(\d+)$/i);
  if (dashFormat) {
    return [dashFormat[1].toUpperCase(), dashFormat[2]];
  }

  const parts = locationString.split(/[,\s]+/);
  let shelf = null;
  let section = null;

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].toLowerCase().includes('shelf') && i + 1 < parts.length) {
      shelf = parts[i + 1].toUpperCase();
    } else if (parts[i].toLowerCase().includes('section') && i + 1 < parts.length) {
      section = parts[i + 1];
    }
  }

  // If still no match, use the whole string as shelf (uppercase)
  if (!shelf && !section) {
    shelf = locationString.toUpperCase();
  }

  return [shelf, section];
}

/**
 * Calculate optimal storage location based on book data
 * @param {Object} bookData - Book data
 * @returns {Promise<Object>} - Optimal storage location
 */
async function calculateOptimalLocation(bookData) {
  // Simple alphabetical organization by author's last name
  const author = bookData.author || 'Unknown';
  const lastName = author.split(' ').pop() || 'Unknown';
  const firstLetter = lastName.charAt(0).toUpperCase();

  // Determine shelf based on first letter
  let shelf = 'A'; // Default
  if (firstLetter >= 'A' && firstLetter <= 'Z') {
    shelf = firstLetter;
  }

  // Query database to find the next available section in this shelf
  try {
    const result = await pool.query(
      "SELECT COALESCE(MAX(CAST(section AS INTEGER)), 0) + 1 as next_section FROM books WHERE shelf_location = $1 AND section ~ '^[0-9]+$'",
      [shelf]
    );

    // Be defensive: some DB mocks or failures may return undefined
    const sectionValue = result?.rows?.[0]?.next_section ?? 1;

    return {
      shelf_location: shelf,
      section: sectionValue.toString(),
    };
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Error calculating optimal location: %s', error);
    // Fallback to default location
    return {
      shelf_location: shelf,
      section: '1',
    };
  }
}

/**
 * Update book quantity and availability
 * @param {number} bookId - Book ID
 * @param {number} quantityChange - Change in quantity (positive or negative)
 * @returns {Promise<Object>} - Updated book data
 */
async function updateInventory(bookId, quantityChange) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE books 
       SET quantity = quantity + $1, 
           available_quantity = available_quantity + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [quantityChange, bookId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  determineStorageLocation,
  parseLocation,
  calculateOptimalLocation,
  updateInventory,
};
