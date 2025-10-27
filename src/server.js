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

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit sync operations to 10 per 15 minutes
  message: 'Too many sync requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes with rate limiting
app.use('/api/books', apiLimiter, bookRoutes);
app.use('/api/sync', syncLimiter, syncRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
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
