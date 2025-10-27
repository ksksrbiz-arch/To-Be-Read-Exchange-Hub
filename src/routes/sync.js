const express = require('express');
const router = express.Router();
const { syncPingoInventory, getSyncHistory } = require('../controllers/syncController');
const { validateSyncPingo } = require('../middleware/validation');

// Sync routes
router.post('/pingo', validateSyncPingo, syncPingoInventory);
router.get('/history', getSyncHistory);

module.exports = router;
