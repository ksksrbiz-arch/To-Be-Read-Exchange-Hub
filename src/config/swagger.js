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
        name: 'Sync',
        description: 'External inventory synchronization',
      },
      {
        name: 'Health',
        description: 'System health and status checks',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/server.js'], // Path to route files with JSDoc annotations
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
