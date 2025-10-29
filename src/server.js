const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const bookRoutes = require('./routes/books');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting middleware (configurable via env)
const API_RATE_WINDOW_MIN = parseInt(process.env.API_RATE_WINDOW_MIN || '15', 10);
const API_RATE_MAX = parseInt(process.env.API_RATE_MAX || '100', 10);
const SYNC_RATE_WINDOW_MIN = parseInt(process.env.SYNC_RATE_WINDOW_MIN || '15', 10);
const SYNC_RATE_MAX = parseInt(process.env.SYNC_RATE_MAX || '10', 10);

const apiLimiter = rateLimit({
  windowMs: API_RATE_WINDOW_MIN * 60 * 1000,
  max: API_RATE_MAX,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const syncLimiter = rateLimit({
  windowMs: SYNC_RATE_WINDOW_MIN * 60 * 1000,
  max: SYNC_RATE_MAX,
  message: 'Too many sync requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Disable caching for all responses in development
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Serve static files with cache control
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: 0, // Disable caching in development
  etag: false,
  lastModified: false
}));

// API Routes with rate limiting
app.use('/api/books', apiLimiter, bookRoutes);
app.use('/api/sync', syncLimiter, syncRoutes);

// Root route
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const logger = require('./utils/logger');
  logger.error('Unhandled error: %s', err.stack || err);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    const logger = require('./utils/logger');
    logger.info(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
