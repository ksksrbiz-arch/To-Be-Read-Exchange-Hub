const request = require('supertest');
const express = require('express');
const errorMiddlewareApp = express();

// Minimal route that forces an error
errorMiddlewareApp.get('/boom', (req, res, next) => {
  next(new Error('Kaboom'));
});

// Attach production-like error handler from server (replicate logic)
errorMiddlewareApp.use((err, req, res, next) => {
  const logger = require('../src/utils/logger');
  logger.error('Unhandled error: %s', err.stack || err);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

describe('Error middleware', () => {
  test('returns standardized JSON on thrown error', async () => {
    const res = await request(errorMiddlewareApp).get('/boom').expect(500);
    expect(res.body).toHaveProperty('error', 'Something went wrong!');
    expect(res.body).toHaveProperty('message', 'Kaboom');
  });
});
