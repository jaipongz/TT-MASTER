const db = require('../config/database');

class Project {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM projects ORDER BY updated_at DESC');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    return rows[0];
  }

  static async create(name, description) {
    const [result] = await db.query(
      'INSERT INTO projects (name, description) VALUES (?, ?)',
      [name, description]
    );
    return result.insertId;
  }

  static async update(id, name, description) {
    await db.query(
      'UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, id]
    );
  }

  static async delete(id) {
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
  }
}

module.exports = Project;