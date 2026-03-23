const db = require('../config/database');

class ProjectPermission {
  static async grant({ projectId, userId, canView, canEdit, grantedBy }) {
    await db.query(
      `INSERT INTO project_permissions (project_id, user_id, can_view, can_edit, granted_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         can_view = VALUES(can_view),
         can_edit = VALUES(can_edit),
         granted_by = VALUES(granted_by),
         updated_at = CURRENT_TIMESTAMP`,
      [projectId, userId, canView ? 1 : 0, canEdit ? 1 : 0, grantedBy || null]
    );
  }

  static async hasViewAccess(projectId, userId) {
    const [rows] = await db.query(
      `SELECT 1
       FROM project_permissions
       WHERE project_id = ? AND user_id = ? AND can_view = 1
       LIMIT 1`,
      [projectId, userId]
    );
    return rows.length > 0;
  }

  static async hasEditAccess(projectId, userId) {
    const [rows] = await db.query(
      `SELECT 1
       FROM project_permissions
       WHERE project_id = ? AND user_id = ? AND can_edit = 1
       LIMIT 1`,
      [projectId, userId]
    );
    return rows.length > 0;
  }

  static async listByProjectId(projectId) {
    const [rows] = await db.query(
      `SELECT pp.user_id, u.username, u.email, u.display_name, pp.can_view, pp.can_edit, pp.updated_at
       FROM project_permissions pp
       INNER JOIN users u ON u.id = pp.user_id
       WHERE pp.project_id = ?
       ORDER BY u.username ASC`,
      [projectId]
    );

    return rows.map((row) => ({
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      display_name: row.display_name,
      can_view: row.can_view === 1,
      can_edit: row.can_edit === 1,
      updated_at: row.updated_at
    }));
  }

  static async revoke(projectId, userId) {
    await db.query('DELETE FROM project_permissions WHERE project_id = ? AND user_id = ?', [projectId, userId]);
  }

  static async listByUserId(userId) {
    const [rows] = await db.query(
      `SELECT p.id AS project_id, p.name AS project_name, pp.can_view, pp.can_edit, pp.updated_at
       FROM project_permissions pp
       INNER JOIN projects p ON p.id = pp.project_id
       WHERE pp.user_id = ?
       ORDER BY p.name ASC`,
      [userId]
    );

    return rows.map((row) => ({
      project_id: row.project_id,
      project_name: row.project_name,
      can_view: row.can_view === 1,
      can_edit: row.can_edit === 1,
      updated_at: row.updated_at
    }));
  }

  static async upsertByUserAndProject({ userId, projectId, canView, canEdit, grantedBy }) {
    await this.grant({
      projectId,
      userId,
      canView,
      canEdit,
      grantedBy
    });
  }

  static async revokeByUserAndProject(userId, projectId) {
    await db.query('DELETE FROM project_permissions WHERE user_id = ? AND project_id = ?', [userId, projectId]);
  }
}

module.exports = ProjectPermission;