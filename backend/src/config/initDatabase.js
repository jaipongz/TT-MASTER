const crypto = require('crypto');
const db = require('./database');

const SEEDED_ADMIN_EMAIL = (process.env.SEEDED_ADMIN_EMAIL || 'admin').toLowerCase();

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

async function ensureProjectsOwnerColumn() {
  try {
    await db.query('ALTER TABLE projects ADD COLUMN owner_id INT NULL');
  } catch (error) {
    if (error && error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

async function ensureProjectsLastUpdatedByColumn() {
  try {
    await db.query('ALTER TABLE projects ADD COLUMN last_updated_by_user_id INT NULL');
  } catch (error) {
    if (error && error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

async function ensureUsersAdminColumn() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0');
  } catch (error) {
    if (error && error.code !== 'ER_DUP_FIELDNAME') {
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }
  }
}

async function ensureUsersEmailColumn() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL');
  } catch (error) {
    if (error && error.code !== 'ER_DUP_FIELDNAME') {
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }
  }

  try {
    await db.query('ALTER TABLE users ADD UNIQUE KEY uniq_users_email (email)');
  } catch (error) {
    if (!error || (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_TOO_LONG_KEY')) {
      if (error && error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  }
}

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(120) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(200) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(120) NOT NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_auth_tokens_user_id (user_id),
      INDEX idx_auth_tokens_expires_at (expires_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS project_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      user_id INT NOT NULL,
      can_view TINYINT(1) NOT NULL DEFAULT 1,
      can_edit TINYINT(1) NOT NULL DEFAULT 0,
      granted_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_project_user (project_id, user_id),
      INDEX idx_pp_user (user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS project_locks (
      project_id INT PRIMARY KEY,
      locked_by_user_id INT NOT NULL,
      locked_by_username VARCHAR(120) NOT NULL,
      locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      heartbeat_at DATETIME NOT NULL,
      INDEX idx_heartbeat (heartbeat_at),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (locked_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

async function seedAdminUser() {
  const [rows] = await db.query('SELECT id FROM users WHERE username = ?', ['admin']);
  if (rows.length > 0) {
    await db.query(
      'UPDATE users SET email = ?, is_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [SEEDED_ADMIN_EMAIL, rows[0].id]
    );
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword('admin123', salt);

  await db.query(
    'INSERT INTO users (username, email, display_name, password_hash, password_salt, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
    ['admin', SEEDED_ADMIN_EMAIL, 'Administrator', passwordHash, salt, 1]
  );

  console.log('🔐 Seeded default admin account: admin / admin123');
}

async function initDatabase() {
  await ensureProjectsOwnerColumn();
  await ensureProjectsLastUpdatedByColumn();
  await ensureTables();
  await ensureUsersAdminColumn();
  await ensureUsersEmailColumn();
  await seedAdminUser();
  console.log('✅ Database schema initialized for auth and permissions');
}

module.exports = initDatabase;