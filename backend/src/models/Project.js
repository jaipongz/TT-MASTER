const db = require('../config/database');

class Project {
  static async getAll() {
    const [rows] = await db.query(
      `SELECT p.*, u.display_name AS last_updated_by_display_name, u.email AS last_updated_by_email
       FROM projects p
       LEFT JOIN users u ON u.id = p.last_updated_by_user_id
       ORDER BY p.updated_at DESC`
    );
    return rows;
  }

  static async getAllByUser(userId) {
    const [rows] = await db.query(
      `SELECT p.*, u.display_name AS last_updated_by_display_name, u.email AS last_updated_by_email
       FROM projects p
       LEFT JOIN project_permissions pp ON pp.project_id = p.id AND pp.user_id = ?
       LEFT JOIN users u ON u.id = p.last_updated_by_user_id
       WHERE p.owner_id = ? OR (pp.can_view = 1)
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [userId, userId]
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      `SELECT p.*, u.display_name AS last_updated_by_display_name, u.email AS last_updated_by_email
       FROM projects p
       LEFT JOIN users u ON u.id = p.last_updated_by_user_id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async getByIdForUser(id, userId) {
    const [rows] = await db.query(
      `SELECT p.*, u.display_name AS last_updated_by_display_name, u.email AS last_updated_by_email
       FROM projects p
       LEFT JOIN project_permissions pp ON pp.project_id = p.id AND pp.user_id = ?
       LEFT JOIN users u ON u.id = p.last_updated_by_user_id
       WHERE p.id = ? AND (p.owner_id = ? OR pp.can_view = 1)
       LIMIT 1`,
      [userId, id, userId]
    );
    return rows[0] || null;
  }

  static async create(name, description, ownerId) {
    const [result] = await db.query(
      'INSERT INTO projects (name, description, owner_id, last_updated_by_user_id) VALUES (?, ?, ?, ?)',
      [name, description, ownerId, ownerId]
    );
    return result.insertId;
  }

  static async update(id, name, description, updatedByUserId) {
    await db.query(
      'UPDATE projects SET name = ?, description = ?, last_updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, updatedByUserId || null, id]
    );
  }

  static async delete(id) {
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
  }

  static async isOwner(projectId, userId) {
    const [rows] = await db.query(
      'SELECT 1 FROM projects WHERE id = ? AND owner_id = ? LIMIT 1',
      [projectId, userId]
    );
    return rows.length > 0;
  }

  static async stampLastUpdatedBy(projectId, userId) {
    await db.query(
      'UPDATE projects SET last_updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId || null, projectId]
    );
  }
}

module.exports = Project;