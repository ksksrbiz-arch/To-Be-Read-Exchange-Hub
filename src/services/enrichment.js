const axios = require('axios');
const { enrichWithAI, generateCoverImage } = require('./aiEnrichment');
const logger = require('../utils/logger');

/**
 * Enriches book data by fetching information from Open Library and Google Books APIs
 * Falls back to AI enrichment if traditional APIs fail
 * @param {string} isbn - The ISBN of the book to enrich
 * @param {Object} options - Additional book data for AI fallback
 * @returns {Promise<Object>} - Enriched book data
 */
async function enrichBookData(isbn, options = {}) {
  const enrichedData = {
    isbn: isbn,
    title: null,
    author: null,
    publisher: null,
    description: null,
    cover_url: null,
  };

  try {
    // Fetch from Open Library API
    const openLibraryData = await fetchFromOpenLibrary(isbn);
    if (openLibraryData) {
      enrichedData.title = enrichedData.title || openLibraryData.title;
      enrichedData.author = enrichedData.author || openLibraryData.author;
      enrichedData.publisher = enrichedData.publisher || openLibraryData.publisher;
      enrichedData.cover_url = enrichedData.cover_url || openLibraryData.cover_url;
    }
  } catch (error) {
    logger.error('Error fetching from Open Library: %s', error.message);
  }

  try {
    // Fetch from Google Books API
    const googleBooksData = await fetchFromGoogleBooks(isbn);
    if (googleBooksData) {
      enrichedData.title = enrichedData.title || googleBooksData.title;
      enrichedData.author = enrichedData.author || googleBooksData.author;
      enrichedData.publisher = enrichedData.publisher || googleBooksData.publisher;
      enrichedData.description = enrichedData.description || googleBooksData.description;
      enrichedData.cover_url = enrichedData.cover_url || googleBooksData.cover_url;
    }
  } catch (error) {
    logger.error('Error fetching from Google Books: %s', error.message);
  }

  // If still missing critical data, try AI enrichment
  if ((!enrichedData.title || !enrichedData.author) && (isbn || options.title || options.author)) {
    try {
      logger.info(`Traditional APIs incomplete, attempting AI enrichment for ISBN: ${isbn}`);
      const aiData = await enrichWithAI({ isbn, ...options });
      
      if (aiData) {
        enrichedData.title = enrichedData.title || aiData.title;
        enrichedData.author = enrichedData.author || aiData.author;
        enrichedData.publisher = enrichedData.publisher || aiData.publisher;
        enrichedData.description = enrichedData.description || aiData.description;
        enrichedData.genre = aiData.genre;
        enrichedData.pages = aiData.pages;
        enrichedData.format = aiData.format;
        enrichedData.enrichment_source = aiData.enrichment_source;
      }
    } catch (aiError) {
      logger.warn(`AI enrichment failed: ${aiError.message}`);
    }
  }

  // If still no cover image, try AI generation
  if (!enrichedData.cover_url && enrichedData.title && process.env.ENABLE_AI_IMAGE_GEN === 'true') {
    try {
      const generatedCover = await generateCoverImage(enrichedData);
      if (generatedCover) {
        enrichedData.cover_url = generatedCover;
        enrichedData.enrichment_source = `${enrichedData.enrichment_source || 'api'}_ai_image`;
      }
    } catch (imgError) {
      logger.warn(`AI cover generation failed: ${imgError.message}`);
    }
  }

  return enrichedData;
}

/**
 * Fetches book data from Open Library API
 * @param {string} isbn - The ISBN of the book
 * @returns {Promise<Object|null>} - Book data from Open Library
 */
async function fetchFromOpenLibrary(isbn) {
  try {
    const response = await axios.get(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      {
        timeout: 5000,
      }
    );

    const bookKey = `ISBN:${isbn}`;
    const bookData = response.data[bookKey];

    if (!bookData) {
      return null;
    }

    return {
      title: bookData.title || null,
      author: bookData.authors ? bookData.authors.map((a) => a.name).join(', ') : null,
      publisher: bookData.publishers ? bookData.publishers.map((p) => p.name).join(', ') : null,
      cover_url: bookData.cover
        ? bookData.cover.large || bookData.cover.medium || bookData.cover.small
        : null,
    };
  } catch (error) {
    logger.error('Open Library API error: %s', error.message);
    return null;
  }
}

/**
 * Fetches book data from Google Books API
 * @param {string} isbn - The ISBN of the book
 * @returns {Promise<Object|null>} - Book data from Google Books
 */
async function fetchFromGoogleBooks(isbn) {
  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, {
      timeout: 5000,
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const bookInfo = response.data.items[0].volumeInfo;

    return {
      title: bookInfo.title || null,
      author: bookInfo.authors ? bookInfo.authors.join(', ') : null,
      publisher: bookInfo.publisher || null,
      description: bookInfo.description || null,
      cover_url: bookInfo.imageLinks
        ? bookInfo.imageLinks.thumbnail || bookInfo.imageLinks.smallThumbnail
        : null,
    };
  } catch (error) {
    logger.error('Google Books API error: %s', error.message);
    return null;
  }
}

module.exports = {
  enrichBookData,
  fetchFromOpenLibrary,
  fetchFromGoogleBooks,
};
