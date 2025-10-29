const express = require('express');
const router = express.Router();
const { syncPingoInventory, getSyncHistory } = require('../controllers/syncController');
const { validateSyncPingo } = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     SyncBook:
 *       type: object
 *       properties:
 *         isbn:
 *           type: string
 *           description: ISBN of the book
 *         title:
 *           type: string
 *         author:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *     SyncRequest:
 *       type: object
 *       required:
 *         - books
 *       properties:
 *         books:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SyncBook'
 *     SyncHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         sync_timestamp:
 *           type: string
 *           format: date-time
 *         books_synced:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [success, partial, failed]
 *         error_message:
 *           type: string
 */

/**
 * @swagger
 * /api/sync/pingo:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Sync Pingo inventory
 *     description: Import books from external Pingo inventory system. Creates or updates books, enriches metadata, and assigns storage locations.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncRequest'
 *           example:
 *             books:
 *               - isbn: "9780451524935"
 *                 title: "1984"
 *                 author: "George Orwell"
 *                 quantity: 5
 *               - isbn: "9780061120084"
 *                 title: "To Kill a Mockingbird"
 *                 quantity: 3
 *     responses:
 *       200:
 *         description: Sync completed (may include partial failures)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 synced:
 *                   type: integer
 *                   description: Number of books successfully synced
 *                 failed:
 *                   type: integer
 *                   description: Number of books that failed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       book:
 *                         type: object
 *                       error:
 *                         type: string
 *       400:
 *         description: Validation error (missing books array)
 *       500:
 *         description: Critical sync failure (transaction rolled back)
 */
router.post('/pingo', validateSyncPingo, syncPingoInventory);

/**
 * @swagger
 * /api/sync/history:
 *   get:
 *     tags:
 *       - Sync
 *     summary: Get sync history
 *     description: Retrieve log of all sync operations
 *     responses:
 *       200:
 *         description: Sync history records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 syncHistory:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SyncHistory'
 *       500:
 *         description: Failed to fetch sync history
 */
router.get('/history', getSyncHistory);

module.exports = router;
