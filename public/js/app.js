// API Base URL
const API_BASE = '/api';

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
    
    // Add Book form
    document.getElementById('addBookForm').addEventListener('submit', handleAddBook);
    
    // Sync Pingo form
    document.getElementById('syncPingoForm').addEventListener('submit', handleSyncPingo);
    
    // Cancel buttons
    document.getElementById('cancelAddBook').addEventListener('click', hideAddBookModal);
    document.getElementById('cancelSync').addEventListener('click', hideSyncModal);
    
    // Close modal buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
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

// Handle Add Book form submission
async function handleAddBook(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const bookData = {
        isbn: formData.get('isbn') || null,
        title: formData.get('title'),
        author: formData.get('author') || null,
        quantity: parseInt(formData.get('quantity')) || 1,
        shelf_location: formData.get('shelf_location') || null
    };
    
    try {
        showNotification('Adding book...', 'info');
        
        const response = await fetch(`${API_BASE}/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookData)
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
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ books })
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

// Load and display books
async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE}/books`);
        const result = await response.json();
        
        if (response.ok && result.books) {
            displayBooks(result.books);
        } else {
            showNotification('Failed to load books', 'error');
        }
    } catch (error) {
        console.error('Error loading books:', error);
        showNotification('Failed to load books', 'error');
    }
}

// Display books in grid
function displayBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    
    if (books.length === 0) {
        booksGrid.innerHTML = '<p class="no-books">No books in inventory. Click "Add Book" to get started!</p>';
        return;
    }
    
    booksGrid.innerHTML = books.map(book => `
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
        </div>
    `).join('');
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
