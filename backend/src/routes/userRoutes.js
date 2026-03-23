const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireSeededAdmin } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.use(requireSeededAdmin);

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.get('/projects', userController.listProjects);
router.get('/:userId', userController.getUserDetail);
router.put('/:userId', userController.updateUser);
router.get('/:userId/permissions', userController.getUserPermissions);
router.put('/:userId/permissions/:projectId', userController.setUserPermission);
router.delete('/:userId/permissions/:projectId', userController.deleteUserPermission);

module.exports = router;