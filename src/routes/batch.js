const express = require('express');
const router = express.Router();
const { upload, batchUploadBooks, getBatchStatus } = require('../controllers/batchUploadController');
const { getInventoryStatus, getIncomingQueue } = require('../services/inventoryTracking');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @swagger
 * /api/batch/upload:
 *   post:
 *     summary: Batch upload books with AI enrichment
 *     description: |
 *       Upload multiple books via CSV/JSON manifest with optional cover images. 
 *       Books are automatically enriched with metadata from AI providers (Gemini, Claude, OpenAI) 
 *       and assigned optimal shelf locations based on genre and capacity.
 *       
 *       **CSV Format:**
 *       ```csv
 *       isbn,upc,asin,title,author,publisher,condition,quantity,description,genre,format,shelf_location
 *       9780123456789,,,The Great Gatsby,F. Scott Fitzgerald,Scribner,Good,5,A classic American novel,Fiction,Hardcover,
 *       ,012345678905,,To Kill a Mockingbird,Harper Lee,J.B. Lippincott,Like New,3,,Fiction,Paperback,
 *       ,,B00ZV9PXP2,Digital Fortress,Dan Brown,St. Martin's Press,New,10,A techno-thriller,Thriller,,
 *       ```
 *       
 *       **Image Naming Convention:**
 *       - Match by ISBN: `isbn_9780123456789.jpg`
 *       - Match by row number: `1.jpg` (first book), `2.jpg` (second book), etc.
 *       
 *       **Supported Conditions:** New, Like New, Very Good, Good, Acceptable, Poor
 *     tags: [Batch Upload]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - manifest
 *             properties:
 *               manifest:
 *                 type: string
 *                 format: binary
 *                 description: CSV or JSON file with book data (max 10MB, max 1000 books)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Book cover images - JPEG, PNG, or WebP (max 100 files, 10MB each)
 *     responses:
 *       202:
 *         description: Batch accepted for background processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchUploadResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized - missing or invalid authentication
 *       413:
 *         description: Payload too large (>10MB per file or >1000 books)
 *       500:
 *         description: Internal server error
 */
router.post(
  '/upload',
  upload.fields([
    { name: 'manifest', maxCount: 1 },
    { name: 'images', maxCount: 100 },
  ]),
  asyncHandler(batchUploadBooks)
);

/**
 * @swagger
 * /api/batch/{id}:
 *   get:
 *     summary: Get batch upload status and progress
 *     description: |
 *       Monitor the processing status of a batch upload including progress, 
 *       success/failure counts, and detailed error logs.
 *       
 *       Polls this endpoint every 2-5 seconds to track progress until status is 'completed' or 'failed'.
 *     tags: [Batch Upload]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Batch upload ID returned from POST /api/batch/upload
 *         schema:
 *           type: integer
 *           example: 123
 *     responses:
 *       200:
 *         description: Batch status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 batch:
 *                   $ref: '#/components/schemas/BatchStatus'
 *       404:
 *         description: Batch not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Batch not found
 */
router.get('/:id', asyncHandler(getBatchStatus));

/**
 * @swagger
 * /api/batch/inventory/status:
 *   get:
 *     summary: Get inventory capacity status
 *     description: |
 *       Retrieve current shelf capacity, utilization percentages, and available space 
 *       across all shelves. Useful for capacity planning and identifying overflow needs.
 *     tags: [Batch Upload]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Inventory capacity report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 capacity:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShelfCapacity'
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory/status', asyncHandler(async (req, res) => {
  const status = await getInventoryStatus();
  res.json({ success: true, ...status });
}));

/**
 * @swagger
 * /api/batch/queue:
 *   get:
 *     summary: View incoming book queue
 *     description: |
 *       View books in the processing queue with detailed status, enrichment progress, 
 *       and shelf allocation. Filter by batch ID or processing status.
 *     tags: [Batch Upload]
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: batch_id
 *         schema:
 *           type: integer
 *           example: 123
 *         description: Filter by specific batch upload ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *           example: pending
 *         description: Filter by processing status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           example: 50
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Queue items retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 queue:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IncomingBook'
 *       401:
 *         description: Unauthorized
 */
router.get('/queue', asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    batch_id: req.query.batch_id ? parseInt(req.query.batch_id, 10) : null,
    limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
  };

  const queue = await getIncomingQueue(filters);
  res.json({ success: true, count: queue.length, queue });
}));

module.exports = router;
