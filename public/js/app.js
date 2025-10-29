// API Base URL
const API_BASE = '/api';

// Global state
let allBooks = [];
let filteredBooks = [];

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
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // Search input
  document.getElementById('searchInput').addEventListener('input', handleSearch);

  // Shelf filter
  document.getElementById('shelfFilter').addEventListener('change', handleFilter);

  // Sort select
  document.getElementById('sortBy').addEventListener('change', handleSort);

  // Add Book form
  document.getElementById('addBookForm').addEventListener('submit', handleAddBook);

  // Sync Pingo form
  document.getElementById('syncPingoForm').addEventListener('submit', handleSyncPingo);

  // Edit Book form
  document.getElementById('editBookForm').addEventListener('submit', handleEditBook);

  // Cancel buttons
  document.getElementById('cancelAddBook').addEventListener('click', hideAddBookModal);
  document.getElementById('cancelSync').addEventListener('click', hideSyncModal);
  document.getElementById('cancelEditBook').addEventListener('click', hideEditBookModal);

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
  document.getElementById('editIsbn').value = book.isbn || '';
  document.getElementById('editTitle').value = book.title || '';
  document.getElementById('editAuthor').value = book.author || '';
  document.getElementById('editPublisher').value = book.publisher || '';
  document.getElementById('editQuantity').value = book.quantity || 0;
  document.getElementById('editShelfLocation').value = 
    (book.shelf_location && book.section) ? `${book.shelf_location}-${book.section}` : (book.shelf_location || '');
  
  document.getElementById('editBookModal').style.display = 'block';
}

// Hide Edit Book Modal
function hideEditBookModal() {
  document.getElementById('editBookModal').style.display = 'none';
}

// Show Book Details Modal
function showBookDetailsModal(book) {
  const content = `
    <div class="book-details">
      <div class="book-details-header">
        ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}" class="book-details-cover">` : '<div class="book-details-cover-placeholder">📖</div>'}
        <div class="book-details-info">
          <h2>${escapeHtml(book.title)}</h2>
          <p class="details-author"><strong>Author:</strong> ${escapeHtml(book.author || 'Unknown')}</p>
          ${book.isbn ? `<p><strong>ISBN:</strong> ${escapeHtml(book.isbn)}</p>` : ''}
          ${book.publisher ? `<p><strong>Publisher:</strong> ${escapeHtml(book.publisher)}</p>` : ''}
          <p><strong>Location:</strong> ${escapeHtml(book.shelf_location || 'N/A')}${book.section ? `-${escapeHtml(book.section)}` : ''}</p>
          <p><strong>Quantity:</strong> ${book.quantity || 0} (Available: ${book.available_quantity || 0})</p>
          <p><strong>Added:</strong> ${new Date(book.created_at).toLocaleDateString()}</p>
          ${book.updated_at !== book.created_at ? `<p><strong>Updated:</strong> ${new Date(book.updated_at).toLocaleDateString()}</p>` : ''}
        </div>
      </div>
      ${book.description ? `
        <div class="book-description">
          <h3>Description</h3>
          <p>${escapeHtml(book.description)}</p>
        </div>
      ` : ''}
      <div class="book-details-actions">
        <button onclick="showEditBookModal(${JSON.stringify(book).replace(/"/g, '&quot;')})" class="btn btn-primary">Edit Book</button>
        <button onclick="deleteBook(${book.id})" class="btn btn-danger">Delete Book</button>
      </div>
    </div>
  `;
  
  document.getElementById('bookDetailsContent').innerHTML = content;
  document.getElementById('bookDetailsModal').style.display = 'block';
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
    isbn: formData.get('isbn') || null,
    title: formData.get('title'),
    author: formData.get('author') || null,
    publisher: formData.get('publisher') || null,
    quantity: parseInt(formData.get('quantity')) || 0,
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
      document.getElementById('bookDetailsModal').style.display = 'none';
      loadBooks();
    } else {
      showNotification(`Error: ${result.error || 'Failed to update book'}`, 'error');
    }
  } catch (error) {
    console.error('Error updating book:', error);
    showNotification('Failed to update book. Please try again.', 'error');
  }
}

// Delete book with confirmation
async function deleteBook(bookId) {
  if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
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
      document.getElementById('bookDetailsModal').style.display = 'none';
      loadBooks();
    } else {
      showNotification(`Error: ${result.error || 'Failed to delete book'}`, 'error');
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    showNotification('Failed to delete book. Please try again.', 'error');
  }
}

// Handle search
function handleSearch() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  filteredBooks = allBooks.filter(book => {
    return (
      (book.title && book.title.toLowerCase().includes(searchTerm)) ||
      (book.author && book.author.toLowerCase().includes(searchTerm)) ||
      (book.isbn && book.isbn.toLowerCase().includes(searchTerm))
    );
  });
  
  applyFiltersAndSort();
}

// Handle shelf filter
function handleFilter() {
  const shelf = document.getElementById('shelfFilter').value;
  
  if (shelf === '') {
    handleSearch(); // Reapply search
  } else {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredBooks = allBooks.filter(book => {
      const matchesSearch = !searchTerm || 
        (book.title && book.title.toLowerCase().includes(searchTerm)) ||
        (book.author && book.author.toLowerCase().includes(searchTerm)) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchTerm));
      
      const matchesShelf = book.shelf_location === shelf;
      
      return matchesSearch && matchesShelf;
    });
  }
  
  applyFiltersAndSort();
}

// Handle sort
function handleSort() {
  applyFiltersAndSort();
}

// Apply filters and sorting
function applyFiltersAndSort() {
  const sortBy = document.getElementById('sortBy').value;
  let booksToDisplay = [...filteredBooks];
  
  // Sort books
  switch(sortBy) {
    case 'title-asc':
      booksToDisplay.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'title-desc':
      booksToDisplay.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
    case 'author-asc':
      booksToDisplay.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
      break;
    case 'author-desc':
      booksToDisplay.sort((a, b) => (b.author || '').localeCompare(a.author || ''));
      break;
    case 'location-asc':
      booksToDisplay.sort((a, b) => {
        const locA = `${a.shelf_location || ''}-${a.section || ''}`;
        const locB = `${b.shelf_location || ''}-${b.section || ''}`;
        return locA.localeCompare(locB);
      });
      break;
    case 'location-desc':
      booksToDisplay.sort((a, b) => {
        const locA = `${a.shelf_location || ''}-${a.section || ''}`;
        const locB = `${b.shelf_location || ''}-${b.section || ''}`;
        return locB.localeCompare(locA);
      });
      break;
    case 'quantity-asc':
      booksToDisplay.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
      break;
    case 'quantity-desc':
      booksToDisplay.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      break;
    case 'date-newest':
      booksToDisplay.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'date-oldest':
      booksToDisplay.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
  }
  
  displayBooks(booksToDisplay);
}

// Export data
function exportData() {
  const format = prompt('Export format (enter "csv" or "json"):', 'csv');
  
  if (!format || (format !== 'csv' && format !== 'json')) {
    return;
  }
  
  if (format === 'json') {
    exportJSON();
  } else {
    exportCSV();
  }
}

// Export as JSON
function exportJSON() {
  const dataStr = JSON.stringify(allBooks, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `book-inventory-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showNotification('Inventory exported as JSON!', 'success');
}

// Export as CSV
function exportCSV() {
  const headers = ['ID', 'ISBN', 'Title', 'Author', 'Publisher', 'Shelf', 'Section', 'Quantity', 'Available', 'Created', 'Updated'];
  const rows = allBooks.map(book => [
    book.id,
    book.isbn || '',
    book.title || '',
    book.author || '',
    book.publisher || '',
    book.shelf_location || '',
    book.section || '',
    book.quantity || 0,
    book.available_quantity || 0,
    book.created_at || '',
    book.updated_at || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const dataBlob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `book-inventory-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showNotification('Inventory exported as CSV!', 'success');
}

// Load and display books
async function loadBooks() {
  try {
    const response = await fetch(`${API_BASE}/books`);
    const result = await response.json();

    if (response.ok && result.books) {
      allBooks = result.books;
      filteredBooks = [...allBooks];
      
      // Update shelf filter options
      updateShelfFilter();
      
      // Apply current sorting
      applyFiltersAndSort();
      
      // Update book count
      document.getElementById('bookCount').textContent = 
        `${allBooks.length} book${allBooks.length !== 1 ? 's' : ''}`;
    } else {
      showNotification('Failed to load books', 'error');
    }
  } catch (error) {
    console.error('Error loading books:', error);
    showNotification('Failed to load books', 'error');
  }
}

// Update shelf filter dropdown
function updateShelfFilter() {
  const shelves = [...new Set(allBooks.map(b => b.shelf_location).filter(Boolean))].sort();
  const shelfFilter = document.getElementById('shelfFilter');
  const currentValue = shelfFilter.value;
  
  shelfFilter.innerHTML = '<option value="">All Shelves</option>' +
    shelves.map(shelf => `<option value="${shelf}">Shelf ${shelf}</option>`).join('');
  
  if (currentValue && shelves.includes(currentValue)) {
    shelfFilter.value = currentValue;
  }
}

// Display books in grid
function displayBooks(books) {
  const booksGrid = document.getElementById('booksGrid');

  if (books.length === 0) {
    booksGrid.innerHTML =
      '<p class="no-books">No books found. Try adjusting your search or filters.</p>';
    return;
  }

  booksGrid.innerHTML = books
    .map(
      (book) => `
        <div class="book-card" onclick='showBookDetailsModal(${JSON.stringify(book).replace(/'/g, '&#39;')})' style="cursor: pointer;">
            ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}" class="book-cover">` : '<div class="book-cover-placeholder">📖</div>'}
            <div class="book-info">
                <h3 class="book-title">${escapeHtml(book.title)}</h3>
                <p class="book-author">${escapeHtml(book.author || 'Unknown Author')}</p>
                ${book.isbn ? `<p class="book-isbn">ISBN: ${escapeHtml(book.isbn)}</p>` : ''}
                ${book.publisher ? `<p class="book-publisher">${escapeHtml(book.publisher)}</p>` : ''}
                <p class="book-location">📍 ${escapeHtml(book.shelf_location || 'N/A')}${book.section ? `-${escapeHtml(book.section)}` : ''}</p>
                <p class="book-quantity">Stock: ${book.available_quantity || 0} / ${book.quantity || 0}</p>
            </div>
            <div class="book-card-actions" onclick="event.stopPropagation();">
                <button class="btn-icon btn-edit" onclick='showEditBookModal(${JSON.stringify(book).replace(/'/g, '&#39;')})' title="Edit">✏️</button>
                <button class="btn-icon btn-delete" onclick="deleteBook(${book.id})" title="Delete">🗑️</button>
            </div>
        </div>
    `
    )
    .join('');
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
