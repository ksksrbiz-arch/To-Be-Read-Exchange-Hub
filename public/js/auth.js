// Client-side authentication utilities

/**
 * Get auth token from localStorage
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Get stored user object
 */
function getStoredUser() {
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Logout user
 */
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

/**
 * Make authenticated fetch request
 * Automatically adds Authorization header and handles 401
 */
async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();
  
  if (!token) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle 401 Unauthorized
  if (response.status === 401) {
    alert('Session expired. Please login again.');
    logout();
    throw new Error('Unauthorized');
  }
  
  return response;
}

/**
 * Update navbar based on auth state
 */
function updateNavbar() {
  const user = getStoredUser();
  const authLinks = document.getElementById('authLinks');
  
  if (!authLinks) return;
  
  if (user) {
    authLinks.innerHTML = `
      <span style="margin-right: 15px; color: #4CAF50;">👤 ${user.display_name || user.email}</span>
      <a href="/dashboard.html" style="margin-right: 15px;">Dashboard</a>
      <a href="#" onclick="logout(); return false;">Logout</a>
    `;
  } else {
    authLinks.innerHTML = `
      <a href="/login.html" style="margin-right: 15px;">Login</a>
      <a href="/register.html">Register</a>
    `;
  }
}

// Auto-update navbar on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateNavbar);
} else {
  updateNavbar();
}
