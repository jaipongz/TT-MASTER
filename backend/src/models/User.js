const db = require('../config/database');

class User {
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT id, username, email, display_name, is_admin, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findByUsername(username) {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  static async create({ username, email, displayName, passwordHash, passwordSalt, isAdmin = false }) {
    const [result] = await db.query(
      'INSERT INTO users (username, email, display_name, password_hash, password_salt, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, displayName, passwordHash, passwordSalt, isAdmin ? 1 : 0]
    );
    return result.insertId;
  }

  static async listAll() {
    const [rows] = await db.query(
      'SELECT id, username, email, display_name, is_admin, created_at, updated_at FROM users ORDER BY username ASC'
    );
    return rows.map((row) => ({
      ...row,
      is_admin: row.is_admin === 1
    }));
  }

  static async createToken(userId, token, expiresAt) {
    await db.query(
      'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
  }

  static async getUserByToken(token) {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.display_name, u.is_admin, t.expires_at
       FROM auth_tokens t
       INNER JOIN users u ON u.id = t.user_id
       WHERE t.token = ?`,
      [token]
    );

    if (rows.length === 0) {
      return null;
    }

    const user = rows[0];
    if (new Date(user.expires_at).getTime() < Date.now()) {
      await db.query('DELETE FROM auth_tokens WHERE token = ?', [token]);
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      is_admin: user.is_admin === 1
    };
  }

  static async setAdmin(userId, isAdmin) {
    await db.query('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, userId]);
  }

  static async updateById(userId, { email, displayName, passwordHash, passwordSalt, isAdmin }) {
    if (passwordHash && passwordSalt) {
      await db.query(
        `UPDATE users
         SET email = ?, display_name = ?, is_admin = ?, password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [email, displayName, isAdmin ? 1 : 0, passwordHash, passwordSalt, userId]
      );
      return;
    }

    await db.query(
      `UPDATE users
       SET email = ?, display_name = ?, is_admin = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [email, displayName, isAdmin ? 1 : 0, userId]
    );
  }

  static async deleteToken(token) {
    await db.query('DELETE FROM auth_tokens WHERE token = ?', [token]);
  }

  static async cleanupExpiredTokens() {
    await db.query('DELETE FROM auth_tokens WHERE expires_at < NOW()');
  }
}

module.exports = User;