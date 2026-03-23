const Project = require('../models/Project');
const ProjectPermission = require('../models/ProjectPermission');
const User = require('../models/User');

function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await User.getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = user;
    req.authToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

async function ensureProjectViewAccess(req, res, next) {
  try {
    if (req.user.is_admin) {
      return next();
    }

    const projectId = Number(req.params.id || req.params.projectId || req.body.projectId);

    const isOwner = await Project.isOwner(projectId, req.user.id);
    if (isOwner) {
      return next();
    }

    const hasView = await ProjectPermission.hasViewAccess(projectId, req.user.id);
    if (!hasView) {
      return res.status(403).json({ success: false, error: 'You do not have access to this project' });
    }

    next();
  } catch (error) {
    next(error);
  }
}

async function ensureProjectEditAccess(req, res, next) {
  try {
    if (req.user.is_admin) {
      return next();
    }

    const projectId = Number(req.params.id || req.params.projectId || req.body.projectId);

    const isOwner = await Project.isOwner(projectId, req.user.id);
    if (isOwner) {
      return next();
    }

    const hasEdit = await ProjectPermission.hasEditAccess(projectId, req.user.id);
    if (!hasEdit) {
      return res.status(403).json({ success: false, error: 'You do not have edit permission for this project' });
    }

    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }
  next();
}

function requireSeededAdmin(req, res, next) {
  const seededAdminUsername = String(process.env.SEEDED_ADMIN_USERNAME || 'admin').toLowerCase();
  if (!req.user || !req.user.is_admin || String(req.user.username || '').toLowerCase() !== seededAdminUsername) {
    return res.status(403).json({ success: false, error: 'Seeded admin only' });
  }
  next();
}

module.exports = {
  requireAuth,
  ensureProjectViewAccess,
  ensureProjectEditAccess,
  requireAdmin,
  requireSeededAdmin
};