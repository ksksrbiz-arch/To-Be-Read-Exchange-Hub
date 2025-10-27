const express = require('express');
const router = express.Router();
const { syncPingoInventory, getSyncHistory } = require('../controllers/syncController');

// Sync routes
router.post('/pingo', syncPingoInventory);
router.get('/history', getSyncHistory);

module.exports = router;
