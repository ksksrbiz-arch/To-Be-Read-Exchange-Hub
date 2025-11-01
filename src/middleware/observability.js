const { v4: uuidv4 } = require('uuid');
const responseTime = require('response-time');
const logger = require('../utils/logger');
const { register, Counter, Histogram, Gauge } = require('prom-client');

// HTTP Request metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
});

// Business metrics
const bookOperations = new Counter({
  name: 'book_operations_total',
  help: 'Total number of book operations',
  labelNames: ['operation', 'status'],
});

const enrichmentDuration = new Histogram({
  name: 'enrichment_duration_seconds',
  help: 'Duration of book enrichment operations',
  labelNames: ['source', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const activeConnections = new Gauge({
  name: 'active_database_connections',
  help: 'Number of active database connections',
});

/**
 * Request correlation ID middleware
 * Adds X-Request-ID to all requests for distributed tracing
 */
const correlationId = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Add to logger context
  req.log = logger.child({ requestId });
  
  next();
};

/**
 * Request metrics middleware
 * Records HTTP metrics for Prometheus
 */
const metricsMiddleware = responseTime((req, res, time) => {
  const route = req.route ? req.route.path : req.path;
  const labels = {
    method: req.method,
    route,
    status_code: res.statusCode,
  };

  // Record duration in seconds
  httpRequestDuration.labels(labels).observe(time / 1000);
  httpRequestTotal.labels(labels).inc();

  // Track errors
  if (res.statusCode >= 400) {
    const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
    httpRequestErrors.labels({
      method: req.method,
      route,
      error_type: errorType,
    }).inc();
  }

  // Structured logging
  req.log.info({
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: time,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  }, 'HTTP Request completed');
});

/**
 * Track business metrics
 */
const trackBookOperation = (operation, status = 'success') => {
  bookOperations.labels({ operation, status }).inc();
};

const trackEnrichment = (source, durationMs, status = 'success') => {
  enrichmentDuration.labels({ source, status }).observe(durationMs / 1000);
};

const updateActiveConnections = (count) => {
  activeConnections.set(count);
};

/**
 * Metrics endpoint handler
 */
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};

module.exports = {
  correlationId,
  metricsMiddleware,
  metricsEndpoint,
  trackBookOperation,
  trackEnrichment,
  updateActiveConnections,
  register,
};
