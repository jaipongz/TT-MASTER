const express = require('express');
const router = express.Router();
const jsonController = require('../controllers/jsonController');

// Get JSON schema by project ID
router.get('/:projectId', jsonController.getJsonSchema);

// Save JSON schema
router.post('/save', jsonController.saveJsonSchema);

module.exports = router;