const Project = require('../models/Project');
const ProjectPermission = require('../models/ProjectPermission');
const ProjectLock = require('../models/ProjectLock');
const User = require('../models/User');

exports.getAllProjects = async (req, res) => {
  try {
    const projects = req.user.is_admin
      ? await Project.getAll()
      : await Project.getAllByUser(req.user.id);
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = req.user.is_admin
      ? await Project.getById(req.params.id)
      : await Project.getByIdForUser(req.params.id, req.user.id);
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
    
    const id = await Project.create(name, description || '', req.user.id);
    await ProjectPermission.grant({
      projectId: id,
      userId: req.user.id,
      canView: true,
      canEdit: true,
      grantedBy: req.user.id
    });

    res.json({ success: true, data: { id, name, description } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = req.user.is_admin
      ? await Project.getById(req.params.id)
      : await Project.getByIdForUser(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    await Project.update(req.params.id, name, description, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const isOwner = await Project.isOwner(req.params.id, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Only project owner can delete project' });
    }

    await Project.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listPermissions = async (req, res) => {
  try {
    const project = await Project.getByIdForUser(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const rows = await ProjectPermission.listByProjectId(req.params.id);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.grantPermission = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const isOwner = await Project.isOwner(projectId, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Only owner can manage permissions' });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const canEdit = req.body.canEdit === true;

    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await ProjectPermission.grant({
      projectId,
      userId: user.id,
      canView: true,
      canEdit,
      grantedBy: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.revokePermission = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const targetUserId = Number(req.params.userId);

    const isOwner = await Project.isOwner(projectId, req.user.id);
    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Only owner can manage permissions' });
    }

    const project = await Project.getById(projectId);
    if (project && Number(project.owner_id) === targetUserId) {
      return res.status(400).json({ success: false, error: 'Cannot revoke owner access' });
    }

    await ProjectPermission.revoke(projectId, targetUserId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.acquireLock = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const project = await Project.getByIdForUser(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const force = req.body.force === true;
    const result = await ProjectLock.acquire({
      projectId,
      userId: req.user.id,
      username: req.user.username,
      force
    });

    if (!result.acquired) {
      return res.status(409).json({
        success: false,
        error: 'Project is currently in use',
        conflict: result.conflict
      });
    }

    res.json({ success: true, data: { ttlSeconds: ProjectLock.LOCK_TTL_SECONDS } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.heartbeatLock = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const ok = await ProjectLock.heartbeat(projectId, req.user.id);
    if (!ok) {
      return res.status(409).json({ success: false, error: 'Lock is not owned by current user' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.releaseLock = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    await ProjectLock.release(projectId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};