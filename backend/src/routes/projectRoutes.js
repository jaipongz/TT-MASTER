const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// GET all projects
router.get('/', projectController.getAllProjects);

// GET project by id
router.get('/:id', projectController.getProject);

// CREATE project
router.post('/', projectController.createProject);

// UPDATE project
router.put('/:id', projectController.updateProject);

// DELETE project
router.delete('/:id', projectController.deleteProject);

module.exports = router;
