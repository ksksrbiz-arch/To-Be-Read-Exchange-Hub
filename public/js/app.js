// API Base URL
const API_BASE = '/api';

// State management
let allBooks = [];
let filteredBooks = [];
let currentSort = 'title-asc';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadBooks();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Add Book button
  document.getElementById('addBookBtn').addEventListener('click', showAddBookModal);

  // Sync Pingo button
  document.getElementById('syncPingoBtn').addEventListener('click', showSyncModal);

  // Export button
  document.getElementById('exportBtn').addEventListener('click', showExportModal);

  // Add Book form
  document.getElementById('addBookForm').addEventListener('submit', handleAddBook);

  // Edit Book form
  document.getElementById('editBookForm').addEventListener('submit', handleEditBook);

  // Sync Pingo form
  document.getElementById('syncPingoForm').addEventListener('submit', handleSyncPingo);

  // Export buttons
  document.getElementById('exportCsvBtn').addEventListener('click', () => exportData('csv'));
  document.getElementById('exportJsonBtn').addEventListener('click', () => exportData('json'));

  // Cancel buttons
  document.getElementById('cancelAddBook').addEventListener('click', hideAddBookModal);
  document.getElementById('cancelEditBook').addEventListener('click', hideEditBookModal);
  document.getElementById('cancelSync').addEventListener('click', hideSyncModal);

  // Search input
  document.getElementById('searchInput').addEventListener('input', handleSearch);

  // Filter dropdown
  document.getElementById('filterShelf').addEventListener('change', handleFilter);

  // Sort dropdown
  document.getElementById('sortSelect').addEventListener('change', handleSort);

  // Close modal buttons
  document.querySelectorAll('.close').forEach((btn) => {
    btn.addEventListener('click', function () {
      this.closest('.modal').style.display = 'none';
    });
  });

  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });
}

// Show Add Book Modal
function showAddBookModal() {
  document.getElementById('addBookModal').style.display = 'block';
  document.getElementById('addBookForm').reset();
}

// Hide Add Book Modal
function hideAddBookModal() {
  document.getElementById('addBookModal').style.display = 'none';
}

// Show Sync Modal
function showSyncModal() {
  document.getElementById('syncModal').style.display = 'block';
  document.getElementById('syncPingoForm').reset();
}

// Hide Sync Modal
function hideSyncModal() {
  document.getElementById('syncModal').style.display = 'none';
}

// Show Edit Book Modal
function showEditBookModal(book) {
  document.getElementById('editBookId').value = book.id;
  document.getElementById('editTitle').value = book.title || '';
  document.getElementById('editAuthor').value = book.author || '';
  document.getElementById('editIsbn').value = book.isbn || '';
  document.getElementById('editPublisher').value = book.publisher || '';
  document.getElementById('editQuantity').value = book.quantity || 1;
  document.getElementById('editShelfLocation').value = book.shelf_location
    ? `${book.shelf_location}${book.section ? '-' + book.section : ''}`
    : '';

  document.getElementById('editBookModal').style.display = 'block';
}

// Hide Edit Book Modal
function hideEditBookModal() {
  document.getElementById('editBookModal').style.display = 'none';
}

// Show View Book Modal
function showViewBookModal(book) {
  const detailsHtml = `
    <h2>${escapeHtml(book.title)}</h2>
    ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}" class="book-detail-cover">` : ''}
    <div class="book-detail-info">
      <p><strong>Author:</strong> ${escapeHtml(book.author || 'Unknown')}</p>
      ${book.isbn ? `<p><strong>ISBN:</strong> ${escapeHtml(book.isbn)}</p>` : ''}
      ${book.publisher ? `<p><strong>Publisher:</strong> ${escapeHtml(book.publisher)}</p>` : ''}
      <p><strong>Location:</strong> ${escapeHtml(book.shelf_location || 'N/A')}${book.section ? '-' + escapeHtml(book.section) : ''}</p>
      <p><strong>Quantity:</strong> ${book.available_quantity || 0} available / ${book.quantity || 0} total</p>
      ${book.description ? `<p><strong>Description:</strong><br>${escapeHtml(book.description)}</p>` : ''}
      <p><strong>Added:</strong> ${new Date(book.created_at).toLocaleDateString()}</p>
      ${book.updated_at !== book.created_at ? `<p><strong>Last Updated:</strong> ${new Date(book.updated_at).toLocaleDateString()}</p>` : ''}
    </div>
  `;

  document.getElementById('bookDetails').innerHTML = detailsHtml;
  document.getElementById('viewBookModal').style.display = 'block';
}

// Show Export Modal
function showExportModal() {
  document.getElementById('exportModal').style.display = 'block';
}

// Handle Add Book form submission
async function handleAddBook(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const bookData = {
    isbn: formData.get('isbn') || null,
    title: formData.get('title'),
    author: formData.get('author') || null,
    quantity: parseInt(formData.get('quantity')) || 1,
    shelf_location: formData.get('shelf_location') || null,
  };

  try {
    showNotification('Adding book...', 'info');

    const response = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookData),
    });

    const result = await response.json();

    if (response.ok) {
      showNotification('Book added successfully!', 'success');
      hideAddBookModal();
      loadBooks();
    } else {
      showNotification(`Error: ${result.error || 'Failed to add book'}`, 'error');
    }
  } catch (error) {
    console.error('Error adding book:', error);
    showNotification('Failed to add book. Please try again.', 'error');
  }
}

// Handle Sync Pingo form submission
async function handleSyncPingo(e) {
  e.preventDefault();

  const pingoDataText = document.getElementById('pingoData').value;

  try {
    const books = JSON.parse(pingoDataText);

    if (!Array.isArray(books)) {
      showNotification('Invalid data format. Expected an array of books.', 'error');
      return;
    }

    showNotification('Syncing Pingo inventory...', 'info');

    const response = await fetch(`${API_BASE}/sync/pingo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ books }),
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(
        `Sync completed! ${result.booksSynced} books synced out of ${result.totalBooks}.`,
        'success'
      );
      hideSyncModal();
      loadBooks();
    } else {
      showNotification(`Error: ${result.error || 'Failed to sync'}`, 'error');
    }
  } catch (error) {
    console.error('Error syncing Pingo inventory:', error);
    showNotification('Invalid JSON format or sync failed.', 'error');
  }
}

// Handle Edit Book form submission
async function handleEditBook(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const bookId = formData.get('id');

  const updateData = {
    title: formData.get('title'),
    author: formData.get('author') || null,
    isbn: formData.get('isbn') || null,
    publisher: formData.get('publisher') || null,
    quantity: parseInt(formData.get('quantity')) || 1,
    shelf_location: formData.get('shelf_location') || null,
  };

  try {
    showNotification('Updating book...', 'info');

    const response = await fetch(`${API_BASE}/books/${bookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const result = await response.json();

    if (response.ok) {
      showNotification('Book updated successfully!', 'success');
      hideEditBookModal();
      loadBooks();
    } else {
      showNotification(`Error: ${result.error || 'Failed to update book'}`, 'error');
    }
  } catch (error) {
    console.error('Error updating book:', error);
    showNotification('Failed to update book. Please try again.', 'error');
  }
}

// Handle Delete Book
async function handleDeleteBook(bookId, bookTitle) {
  if (!confirm(`Are you sure you want to delete "${bookTitle}"?`)) {
    return;
  }

  try {
    showNotification('Deleting book...', 'info');

    const response = await fetch(`${API_BASE}/books/${bookId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (response.ok) {
      showNotification('Book deleted successfully!', 'success');
      loadBooks();
    } else {
      showNotification(`Error: ${result.error || 'Failed to delete book'}`, 'error');
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    showNotification('Failed to delete book. Please try again.', 'error');
  }
}

// Handle Search
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();

  filteredBooks = allBooks.filter((book) => {
    return (
      (book.title && book.title.toLowerCase().includes(searchTerm)) ||
      (book.author && book.author.toLowerCase().includes(searchTerm)) ||
      (book.isbn && book.isbn.toLowerCase().includes(searchTerm))
    );
  });

  applyFiltersAndSort();
}

// Handle Filter
function handleFilter(e) {
  const shelfFilter = e.target.value;

  if (!shelfFilter) {
    filteredBooks = [...allBooks];
  } else {
    filteredBooks = allBooks.filter((book) => book.shelf_location === shelfFilter);
  }

  // Reapply search if there's text in search box
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  if (searchTerm) {
    filteredBooks = filteredBooks.filter((book) => {
      return (
        (book.title && book.title.toLowerCase().includes(searchTerm)) ||
        (book.author && book.author.toLowerCase().includes(searchTerm)) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchTerm))
      );
    });
  }

  applyFiltersAndSort();
}

// Handle Sort
function handleSort(e) {
  currentSort = e.target.value;
  applyFiltersAndSort();
}

// Apply filters and sorting
function applyFiltersAndSort() {
  let booksToDisplay = [...filteredBooks];

  // Sort books
  const [sortBy, sortOrder] = currentSort.split('-');

  booksToDisplay.sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'title':
        aVal = (a.title || '').toLowerCase();
        bVal = (b.title || '').toLowerCase();
        break;
      case 'author':
        aVal = (a.author || '').toLowerCase();
        bVal = (b.author || '').toLowerCase();
        break;
      case 'location':
        aVal = (a.shelf_location || '') + (a.section || '');
        bVal = (b.shelf_location || '') + (b.section || '');
        break;
      case 'quantity':
        aVal = a.quantity || 0;
        bVal = b.quantity || 0;
        break;
      case 'date':
        aVal = new Date(a.created_at || 0);
        bVal = new Date(b.created_at || 0);
        break;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  displayBooks(booksToDisplay);
}

// Export data
function exportData(format) {
  if (allBooks.length === 0) {
    showNotification('No data to export', 'error');
    return;
  }

  if (format === 'csv') {
    exportCsv();
  } else if (format === 'json') {
    exportJson();
  }

  document.getElementById('exportModal').style.display = 'none';
}

// Export as CSV
function exportCsv() {
  const headers = [
    'ID',
    'Title',
    'Author',
    'ISBN',
    'Publisher',
    'Shelf Location',
    'Section',
    'Quantity',
    'Available',
    'Added',
  ];
  const rows = allBooks.map((book) => [
    book.id,
    book.title || '',
    book.author || '',
    book.isbn || '',
    book.publisher || '',
    book.shelf_location || '',
    book.section || '',
    book.quantity || 0,
    book.available_quantity || 0,
    new Date(book.created_at).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  downloadFile(csvContent, 'books-inventory.csv', 'text/csv');
  showNotification('CSV exported successfully!', 'success');
}

// Export as JSON
function exportJson() {
  const jsonContent = JSON.stringify(allBooks, null, 2);
  downloadFile(jsonContent, 'books-inventory.json', 'application/json');
  showNotification('JSON exported successfully!', 'success');
}

// Download file helper
function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Load and display books
async function loadBooks() {
  try {
    const response = await fetch(`${API_BASE}/books`);
    const result = await response.json();

    if (response.ok && result.books) {
      allBooks = result.books;
      filteredBooks = [...allBooks];
      updateShelfFilter();
      applyFiltersAndSort();
    } else {
      showNotification('Failed to load books', 'error');
    }
  } catch (error) {
    console.error('Error loading books:', error);
    showNotification('Failed to load books', 'error');
  }
}

// Update shelf filter options
function updateShelfFilter() {
  const shelves = [...new Set(allBooks.map((book) => book.shelf_location).filter(Boolean))].sort();
  const filterSelect = document.getElementById('filterShelf');

  filterSelect.innerHTML =
    '<option value="">All Shelves</option>' +
    shelves.map((shelf) => `<option value="${shelf}">Shelf ${shelf}</option>`).join('');
}

// Display books in grid
function displayBooks(books) {
  const booksGrid = document.getElementById('booksGrid');
  const bookCount = document.getElementById('bookCount');

  bookCount.textContent = books.length;

  if (books.length === 0) {
    booksGrid.innerHTML =
      '<p class="no-books">No books in inventory. Click "Add Book" to get started!</p>';
    return;
  }

  booksGrid.innerHTML = books
    .map(
      (book) => `
        <div class="book-card">
            ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}" class="book-cover">` : '<div class="book-cover-placeholder">📖</div>'}
            <div class="book-info">
                <h3 class="book-title">${escapeHtml(book.title)}</h3>
                <p class="book-author">${escapeHtml(book.author || 'Unknown Author')}</p>
                ${book.isbn ? `<p class="book-isbn">ISBN: ${escapeHtml(book.isbn)}</p>` : ''}
                ${book.publisher ? `<p class="book-publisher">${escapeHtml(book.publisher)}</p>` : ''}
                <p class="book-location">📍 ${escapeHtml(book.shelf_location || 'N/A')}${book.section ? `-${escapeHtml(book.section)}` : ''}</p>
                <p class="book-quantity">Stock: ${book.available_quantity || 0} / ${book.quantity || 0}</p>
            </div>
            <div class="book-actions">
                <button class="btn-action btn-view" onclick='viewBook(${JSON.stringify(book).replace(/'/g, '&apos;')})' title="View Details">👁️</button>
                <button class="btn-action btn-edit" onclick='editBook(${JSON.stringify(book).replace(/'/g, '&apos;')})' title="Edit">✏️</button>
                <button class="btn-action btn-delete" onclick='deleteBook(${book.id}, "${escapeHtml(book.title).replace(/"/g, '&quot;')}")' title="Delete">🗑️</button>
            </div>
        </div>
    `
    )
    .join('');
}

// Global functions for onclick handlers

function editBook(book) {
  showEditBookModal(book);
}

function deleteBook(bookId, bookTitle) {
  handleDeleteBook(bookId, bookTitle);
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type} show`;

  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
