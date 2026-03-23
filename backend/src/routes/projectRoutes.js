const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth, ensureProjectEditAccess, ensureProjectViewAccess } = require('../middleware/authMiddleware');

router.use(requireAuth);

// GET all projects
router.get('/', projectController.getAllProjects);

// GET project by id
router.get('/:id', ensureProjectViewAccess, projectController.getProject);

// CREATE project
router.post('/', projectController.createProject);

// UPDATE project
router.put('/:id', ensureProjectEditAccess, projectController.updateProject);

// DELETE project
router.delete('/:id', ensureProjectEditAccess, projectController.deleteProject);

// PERMISSION management
router.get('/:id/permissions', ensureProjectViewAccess, projectController.listPermissions);
router.post('/:id/permissions/grant', ensureProjectEditAccess, projectController.grantPermission);
router.delete('/:id/permissions/:userId', ensureProjectEditAccess, projectController.revokePermission);

// PROJECT lock
router.post('/:id/lock', ensureProjectEditAccess, projectController.acquireLock);
router.post('/:id/lock/heartbeat', ensureProjectEditAccess, projectController.heartbeatLock);
router.delete('/:id/lock', ensureProjectEditAccess, projectController.releaseLock);

module.exports = router;
