const User = require('../models/User');
const Project = require('../models/Project');
const ProjectPermission = require('../models/ProjectPermission');
const { createSalt, hashPassword } = require('../utils/security');

function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

async function generateUsernameFromEmail(email) {
  const prefix = String(email || '').split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '') || 'user';
  let username = prefix.toLowerCase();
  let counter = 1;

  while (await User.findByUsername(username)) {
    counter += 1;
    username = `${prefix}${counter}`.toLowerCase();
  }

  return username;
}

exports.listUsers = async (req, res) => {
  try {
    const users = (await User.listAll()).map((user) => ({
      email: user.email,
      display_name: user.display_name,
      is_admin: user.is_admin,
      created_at: user.created_at,
      updated_at: user.updated_at,
      user_ref: user.id
    }));
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const displayName = String(req.body.displayName || '').trim();
    const password = String(req.body.password || '');
    const isAdmin = req.body.isAdmin === true;

    if (!email || !displayName || !password) {
      return res.status(400).json({ success: false, error: 'email, displayName and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'password must be at least 6 characters' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    const username = await generateUsernameFromEmail(email);

    const salt = createSalt();
    const passwordHash = hashPassword(password, salt);
    const userId = await User.create({
      username,
      email,
      displayName,
      passwordHash,
      passwordSalt: salt,
      isAdmin
    });

    res.json({
      success: true,
      data: {
        id: userId,
        email,
        display_name: displayName,
        is_admin: isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        display_name: user.display_name,
        is_admin: user.is_admin === 1 || user.is_admin === true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const email = String(req.body.email || '').trim().toLowerCase();
    const displayName = String(req.body.displayName || '').trim();
    const password = String(req.body.password || '');
    const isAdmin = req.body.isAdmin === true;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!email || !displayName) {
      return res.status(400).json({ success: false, error: 'email and displayName are required' });
    }

    const existingByEmail = await User.findByEmail(email);
    if (existingByEmail && Number(existingByEmail.id) !== userId) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'password must be at least 6 characters' });
      }
      const salt = createSalt();
      const passwordHash = hashPassword(password, salt);
      await User.updateById(userId, {
        email,
        displayName,
        isAdmin,
        passwordHash,
        passwordSalt: salt
      });
    } else {
      await User.updateById(userId, {
        email,
        displayName,
        isAdmin
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.listProjects = async (req, res) => {
  try {
    const projects = await Project.getAll();
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserPermissions = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const permissions = await ProjectPermission.listByUserId(userId);
    res.json({ success: true, data: permissions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.setUserPermission = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const projectId = Number(req.params.projectId);
    const canView = req.body.canView === true;
    const canEdit = req.body.canEdit === true;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const project = await Project.getById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!canView && !canEdit) {
      await ProjectPermission.revokeByUserAndProject(userId, projectId);
      return res.json({ success: true });
    }

    await ProjectPermission.upsertByUserAndProject({
      userId,
      projectId,
      canView: canView || canEdit,
      canEdit,
      grantedBy: req.user.id
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteUserPermission = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const projectId = Number(req.params.projectId);
    await ProjectPermission.revokeByUserAndProject(userId, projectId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};