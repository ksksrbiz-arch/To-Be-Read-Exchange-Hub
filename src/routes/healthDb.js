const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * @swagger
 * /api/health/db:
 *   get:
 *     tags:
 *       - Health
 *     summary: Database health check
 *     description: Verifies PostgreSQL database connectivity
 *     responses:
 *       200:
 *         description: Database is connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 db:
 *                   type: string
 *                   example: connected
 *       500:
 *         description: Database connection failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 db:
 *                   type: string
 *                   example: disconnected
 *                 error:
 *                   type: string
 */
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
