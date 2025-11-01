const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  bulkImportBooks,
  bulkUpdateBooks,
  bulkDeleteBooks,
} = require('../controllers/bulkController');

// Configure multer for CSV uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     BulkImportBook:
 *       type: object
 *       properties:
 *         isbn:
 *           type: string
 *           description: ISBN (required if title not provided)
 *         title:
 *           type: string
 *           description: Book title (required if ISBN not provided)
 *         author:
 *           type: string
 *         publisher:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Required
 *         shelf_location:
 *           type: string
 *           description: Manual location (optional)
 *     BulkImportResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         total:
 *           type: integer
 *         successful:
 *           type: integer
 *         failed:
 *           type: integer
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               row:
 *                 type: integer
 *               book:
 *                 type: object
 *               error:
 *                 type: string
 *         books:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Book'
 *     BulkUpdate:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Book ID to update
 *         fields:
 *           type: object
 *           description: Fields to update
 *           properties:
 *             title:
 *               type: string
 *             author:
 *               type: string
 *             publisher:
 *               type: string
 *             quantity:
 *               type: integer
 */

/**
 * @swagger
 * /api/books/bulk:
 *   post:
 *     tags:
 *       - Books
 *     summary: Bulk import books
 *     description: Import multiple books from CSV file or JSON array. Supports up to 1000 books per request. Automatically enriches metadata and assigns storage locations.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns - isbn, title, author, quantity, shelf_location (optional)
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               books:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/BulkImportBook'
 *           example:
 *             books:
 *               - isbn: "9780451524935"
 *                 quantity: 5
 *               - title: "The Great Gatsby"
 *                 author: "F. Scott Fitzgerald"
 *                 quantity: 3
 *     responses:
 *       201:
 *         description: All books imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkImportResponse'
 *       207:
 *         description: Partial success (some books failed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkImportResponse'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Import failed (transaction rolled back)
 */
router.post('/', upload.single('file'), bulkImportBooks);

/**
 * @swagger
 * /api/books/bulk:
 *   put:
 *     tags:
 *       - Books
 *     summary: Bulk update books
 *     description: Update multiple books in a single request. Maximum 500 updates per request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/BulkUpdate'
 *           example:
 *             updates:
 *               - id: 1
 *                 fields:
 *                   quantity: 10
 *                   shelf_location: "A-5"
 *               - id: 2
 *                 fields:
 *                   author: "Updated Author"
 *     responses:
 *       200:
 *         description: All updates successful
 *       207:
 *         description: Partial success (some updates failed)
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Update failed (transaction rolled back)
 */
router.put('/', bulkUpdateBooks);

/**
 * @swagger
 * /api/books/bulk:
 *   delete:
 *     tags:
 *       - Books
 *     summary: Bulk delete books
 *     description: Delete multiple books by ID. Maximum 500 deletions per request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *           example:
 *             ids: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Deletion completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deleted:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 notFound:
 *                   type: array
 *                   items:
 *                     type: integer
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Deletion failed (transaction rolled back)
 */
router.delete('/', bulkDeleteBooks);

module.exports = router;
