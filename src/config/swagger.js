const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'To-Be-Read Exchange Hub API',
      version: '1.0.0',
      description:
        'API for managing a community book exchange inventory with automated enrichment and sync capabilities',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Books',
        description: 'Book inventory management',
      },
      {
        name: 'Batch Upload',
        description: 'Bulk book upload with AI enrichment and automatic shelf allocation',
      },
      {
        name: 'Sync',
        description: 'External inventory synchronization',
      },
      {
        name: 'Health',
        description: 'System health and status checks',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
      schemas: {
        BatchUploadResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Batch upload accepted for processing' },
            batch_id: { type: 'integer', example: 123 },
            total_books: { type: 'integer', example: 50 },
          },
        },
        BatchStatus: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 123 },
            user_id: { type: 'integer', example: 1 },
            total_books: { type: 'integer', example: 50 },
            processed_books: { type: 'integer', example: 25 },
            successful_books: { type: 'integer', example: 23 },
            failed_books: { type: 'integer', example: 2 },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'], example: 'processing' },
            progress: { type: 'number', format: 'float', example: 50.0 },
            error_log: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'integer', example: 5 },
                  error: { type: 'string', example: 'Invalid ISBN format' },
                  isbn: { type: 'string', example: '9780123456789' },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        IncomingBook: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 456 },
            batch_id: { type: 'integer', example: 123 },
            isbn: { type: 'string', example: '9780743273565' },
            upc: { type: 'string', example: '012345678905' },
            asin: { type: 'string', example: 'B00ZV9PXP2' },
            title: { type: 'string', example: 'The Great Gatsby' },
            author: { type: 'string', example: 'F. Scott Fitzgerald' },
            condition: { type: 'string', enum: ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Poor'], example: 'Good' },
            processing_status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'], example: 'completed' },
            shelf_location: { type: 'string', example: 'A-12' },
            enrichment_status: { type: 'string', enum: ['pending', 'completed', 'failed'], example: 'completed' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ShelfCapacity: {
          type: 'object',
          properties: {
            shelf: { type: 'string', example: 'A' },
            section: { type: 'string', example: '12' },
            max_capacity: { type: 'integer', example: 100 },
            current_count: { type: 'integer', example: 75 },
            utilization: { type: 'number', format: 'float', example: 75.0 },
            available: { type: 'integer', example: 25 },
            genre_preference: { type: 'string', example: 'Fiction' },
            location_notes: { type: 'string', example: 'Main floor, west wall' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Row 5: Invalid ISBN format: invalid-isbn' },
                  row: { type: 'integer', example: 5 },
                  isbn: { type: 'string', example: 'invalid-isbn' },
                },
              },
            },
          },
        },
      },
    },
    security: [
      { BearerAuth: [] },
      { ApiKeyAuth: [] },
    ],
  },
  apis: ['./src/routes/*.js', './src/server.js'], // Path to route files with JSDoc annotations
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
