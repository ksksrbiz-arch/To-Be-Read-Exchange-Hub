const express = require('express');
const router = express.Router();
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require('../controllers/bookController');
const asyncHandler = require('../utils/asyncHandler');
const { validateCreateBook, validateUpdateBook } = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated book ID
 *         isbn:
 *           type: string
 *           description: ISBN-10 or ISBN-13
 *           example: "9780142424179"
 *         title:
 *           type: string
 *           description: Book title
 *           example: "The Sirens of Titan"
 *         author:
 *           type: string
 *           description: Book author
 *           example: "Kurt Vonnegut"
 *         publisher:
 *           type: string
 *           description: Publisher name
 *         description:
 *           type: string
 *           description: Book description/summary
 *         shelf_location:
 *           type: string
 *           description: Physical shelf location
 *           example: "A-1"
 *         section:
 *           type: string
 *           description: Section within shelf
 *         quantity:
 *           type: integer
 *           description: Total copies
 *           example: 3
 *         available_quantity:
 *           type: integer
 *           description: Available copies
 *           example: 2
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     BookInput:
 *       type: object
 *       required:
 *         - quantity
 *       properties:
 *         isbn:
 *           type: string
 *           pattern: '^[0-9]{10}([0-9]{3})?$'
 *           description: ISBN-10 or ISBN-13 (required if title not provided)
 *         title:
 *           type: string
 *           maxLength: 500
 *           description: Book title (required if ISBN not provided)
 *         author:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Number of copies
 *         shelf_location:
 *           type: string
 *           description: Manual shelf location (auto-calculated if omitted)
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         details:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * /api/books:
 *   post:
 *     tags:
 *       - Books
 *     summary: Create a new book
 *     description: Add a book to inventory. Automatically enriches metadata from Open Library and Google Books if ISBN provided.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookInput'
 *           examples:
 *             withISBN:
 *               summary: Create with ISBN (auto-enrichment)
 *               value:
 *                 isbn: "9780142424179"
 *                 quantity: 2
 *             withTitle:
 *               summary: Create with manual title
 *               value:
 *                 title: "The Sirens of Titan"
 *                 author: "Kurt Vonnegut"
 *                 quantity: 1
 *                 shelf_location: "B-5"
 *     responses:
 *       201:
 *         description: Book created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 book:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/', validateCreateBook, asyncHandler(createBook));

/**
 * @swagger
 * /api/books:
 *   get:
 *     tags:
 *       - Books
 *     summary: Get all books
 *     description: Retrieve complete book inventory
 *     responses:
 *       200:
 *         description: List of all books
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 books:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Book'
 */
router.get('/', asyncHandler(getBooks));

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     tags:
 *       - Books
 *     summary: Get a book by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Book not found
 */
router.get('/:id', asyncHandler(getBookById));

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     tags:
 *       - Books
 *     summary: Update a book
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               publisher:
 *                 type: string
 *               description:
 *                 type: string
 *               shelf_location:
 *                 type: string
 *               section:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               available_quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Book updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 book:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: Validation error or no fields to update
 *       404:
 *         description: Book not found
 */
router.put('/:id', validateUpdateBook, asyncHandler(updateBook));

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     tags:
 *       - Books
 *     summary: Delete a book
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Book deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Book not found
 */
router.delete('/:id', asyncHandler(deleteBook));

module.exports = router;
