const express = require('express');
const router = express.Router();
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require('../controllers/bookController');
const { validateCreateBook, validateUpdateBook } = require('../middleware/validation');

// Book routes
router.post('/', validateCreateBook, createBook);
router.get('/', getBooks);
router.get('/:id', getBookById);
router.put('/:id', validateUpdateBook, updateBook);
router.delete('/:id', deleteBook);

module.exports = router;
