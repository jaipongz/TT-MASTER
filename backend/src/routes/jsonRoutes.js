const express = require('express');
const router = express.Router();
const jsonController = require('../controllers/jsonController');
const { requireAuth, ensureProjectViewAccess, ensureProjectEditAccess } = require('../middleware/authMiddleware');

router.use(requireAuth);

// Get JSON schema by project ID
router.get('/:projectId', ensureProjectViewAccess, jsonController.getJsonSchema);

// Save JSON schema
router.post('/save', ensureProjectEditAccess, jsonController.saveJsonSchema);

module.exports = router;