const axios = require('axios');

/**
 * Enriches book data by fetching information from Open Library and Google Books APIs
 * @param {string} isbn - The ISBN of the book to enrich
 * @returns {Promise<Object>} - Enriched book data
 */
async function enrichBookData(isbn) {
  const enrichedData = {
    isbn: isbn,
    title: null,
    author: null,
    publisher: null,
    description: null,
    cover_url: null
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
    console.error('Error fetching from Open Library:', error.message);
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
    console.error('Error fetching from Google Books:', error.message);
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
    const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, {
      timeout: 5000
    });

    const bookKey = `ISBN:${isbn}`;
    const bookData = response.data[bookKey];

    if (!bookData) {
      return null;
    }

    return {
      title: bookData.title || null,
      author: bookData.authors ? bookData.authors.map(a => a.name).join(', ') : null,
      publisher: bookData.publishers ? bookData.publishers.map(p => p.name).join(', ') : null,
      cover_url: bookData.cover ? (bookData.cover.large || bookData.cover.medium || bookData.cover.small) : null
    };
  } catch (error) {
    console.error('Open Library API error:', error.message);
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
      timeout: 5000
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
      cover_url: bookInfo.imageLinks ? (bookInfo.imageLinks.thumbnail || bookInfo.imageLinks.smallThumbnail) : null
    };
  } catch (error) {
    console.error('Google Books API error:', error.message);
    return null;
  }
}

module.exports = {
  enrichBookData,
  fetchFromOpenLibrary,
  fetchFromGoogleBooks
};
