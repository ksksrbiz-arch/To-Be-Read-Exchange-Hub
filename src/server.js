const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const compression = require('compression');
require('dotenv').config();

const bookRoutes = require('./routes/books');
const bulkRoutes = require('./routes/bulk');
const syncRoutes = require('./routes/sync');
const healthDbRoute = require('./routes/healthDb');
const swaggerSpec = require('./config/swagger');

// Enterprise middleware
const { securityHeaders, sanitizeInput, apiKeyAuth } = require('./middleware/security');
const { correlationId, metricsMiddleware, metricsEndpoint } = require('./middleware/observability');
const featureFlags = require('./utils/featureFlags');
const { sloMonitor } = require('./utils/sloMonitor');
const pool = require('./config/database');

const app = express();

// Always trust proxy for correct client IP detection behind reverse proxy (Docker, etc)
app.set('trust proxy', 1);
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
app.use(compression()); // Gzip compression
app.use(securityHeaders); // Enterprise security headers
app.use(correlationId); // Request correlation IDs
app.use(metricsMiddleware); // Prometheus metrics
app.use(featureFlags.middleware()); // Feature flags
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sanitizeInput); // Input sanitization

// Disable caching for all responses in development
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Serve static files with cache control
app.use(
  express.static(path.join(__dirname, '../public'), {
    maxAge: 0, // Disable caching in development
    etag: false,
    lastModified: false,
  })
);

// API Routes with rate limiting
app.use('/api/books/bulk', apiLimiter, apiKeyAuth, bulkRoutes);
app.use('/api/books', apiLimiter, apiKeyAuth, bookRoutes);
app.use('/api/sync', syncLimiter, apiKeyAuth, syncRoutes);
app.use('/api/health/db', healthDbRoute);

// Enterprise endpoints
app.get('/metrics', metricsEndpoint); // Prometheus metrics
app.get('/api/slo', (req, res) => {
  // Service Level Objectives status
  res.json(sloMonitor.getStatus());
});
app.get('/api/features', (req, res) => {
  // Feature flags (for admin dashboard)
  if (req.features) {
    res.json({
      success: true,
      features: req.features.getAll(),
    });
  } else {
    res.status(500).json({ success: false, error: 'Feature flags not initialized' });
  }
});

// API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'To-Be-Read Exchange Hub API',
  })
);

// Root route
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Basic health check
 *     description: Returns server status and current timestamp
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 version:
 *                   type: string
 *                   description: API version
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: 'v1',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const logger = require('./utils/logger');
  
  // Log with correlation ID
  if (req.log) {
    req.log.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  } else {
    logger.error('Unhandled error: %s', err.stack || err);
  }
  
  // Track SLO
  sloMonitor.recordRequest(0, true);
  
  // Don't leak internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    error: 'Something went wrong!',
    message,
    requestId: req.id,
  });
});

// Start server with graceful shutdown
if (require.main === module) {
  const server = app.listen(PORT, () => {
    const logger = require('./utils/logger');
    logger.info({
      port: PORT,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      features: featureFlags.getAllFlags(),
    }, 'Server started successfully');
  });

  // Setup graceful shutdown
  const GracefulShutdown = require('./utils/gracefulShutdown');
  const shutdown = new GracefulShutdown(server, pool);
  
  // Add shutdown check to health endpoint
  app.use(shutdown.healthCheckMiddleware());
}

module.exports = app;
