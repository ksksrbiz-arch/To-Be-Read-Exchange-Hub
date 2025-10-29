const logger = require('../utils/logger');

/**
 * Graceful shutdown manager
 * Handles SIGTERM/SIGINT signals and drains connections properly
 */
class GracefulShutdown {
  constructor(server, pool, options = {}) {
    this.server = server;
    this.pool = pool;
    this.shuttingDown = false;
    
    this.options = {
      timeout: options.timeout || 30000, // 30 seconds
      keepAliveTimeout: options.keepAliveTimeout || 5000,
      headersTimeout: options.headersTimeout || 6000,
    };

    this.connections = new Set();
    this.setupConnectionTracking();
    this.setupSignalHandlers();
  }

  /**
   * Track active connections
   */
  setupConnectionTracking() {
    this.server.on('connection', (connection) => {
      this.connections.add(connection);
      
      connection.on('close', () => {
        this.connections.delete(connection);
      });
    });

    // Set server timeouts
    this.server.keepAliveTimeout = this.options.keepAliveTimeout;
    this.server.headersTimeout = this.options.headersTimeout;
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    const shutdownHandler = async (signal) => {
      if (this.shuttingDown) {
        logger.warn('Shutdown already in progress, force exiting...');
        process.exit(1);
      }

      logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');
      this.shuttingDown = true;

      try {
        await this.shutdown();
        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error({ error }, 'Uncaught exception');
      shutdownHandler('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, 'Unhandled promise rejection');
      shutdownHandler('unhandledRejection');
    });
  }

  /**
   * Execute graceful shutdown
   */
  async shutdown() {
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, this.options.timeout);

    try {
      // Step 1: Stop accepting new connections
      logger.info('Step 1: Stopping server from accepting new connections');
      await new Promise((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Step 2: Close existing idle connections
      logger.info({ count: this.connections.size }, 'Step 2: Closing idle connections');
      for (const connection of this.connections) {
        if (!connection.destroyed) {
          connection.end();
        }
      }

      // Wait a moment for connections to close gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Destroy remaining connections
      logger.info({ remaining: this.connections.size }, 'Step 3: Destroying remaining connections');
      for (const connection of this.connections) {
        if (!connection.destroyed) {
          connection.destroy();
        }
      }

      // Step 4: Close database connections
      logger.info('Step 4: Closing database connection pool');
      await this.pool.end();

      clearTimeout(shutdownTimeout);
    } catch (error) {
      clearTimeout(shutdownTimeout);
      throw error;
    }
  }

  /**
   * Health check middleware that returns 503 during shutdown
   */
  healthCheckMiddleware() {
    return (req, res, next) => {
      if (this.shuttingDown) {
        res.status(503).json({
          status: 'shutting_down',
          message: 'Server is shutting down, please retry request',
        });
      } else {
        next();
      }
    };
  }

  /**
   * Check if server is shutting down
   */
  isShuttingDown() {
    return this.shuttingDown;
  }
}

module.exports = GracefulShutdown;
