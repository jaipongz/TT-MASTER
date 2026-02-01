const Project = require('../models/Project');

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.getAll();
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.getById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }
    
    const id = await Project.create(name, description || '');
    res.json({ success: true, data: { id, name, description } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    await Project.update(req.params.id, name, description);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    await Project.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};