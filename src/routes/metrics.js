const express = require('express');
const router = express.Router();
const batchMetrics = require('../utils/batchMetrics');

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     description: |
 *       Returns metrics in Prometheus text exposition format.
 *       Configure Prometheus to scrape this endpoint for monitoring.
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 # HELP batch_uploads_total Total number of batch uploads
 *                 # TYPE batch_uploads_total counter
 *                 batch_uploads_total 42
 */
router.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(batchMetrics.getPrometheusMetrics());
});

/**
 * @swagger
 * /metrics/json:
 *   get:
 *     summary: Get metrics in JSON format
 *     description: Returns all batch upload metrics in JSON format for dashboards
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 batches:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     processing:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                 enrichment:
 *                   type: object
 *                   properties:
 *                     totalCalls:
 *                       type: integer
 *                     totalCost:
 *                       type: number
 *                     avgResponseTime:
 *                       type: number
 */
router.get('/metrics/json', (req, res) => {
  res.json(batchMetrics.getMetrics());
});

module.exports = router;
