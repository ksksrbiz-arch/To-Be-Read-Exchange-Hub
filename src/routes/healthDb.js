const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/health/db - Database health check
router.get('/', async (req, res) => {
  try {
    // Simple query to check DB connectivity
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

module.exports = router;
