-- 001_user_management_auth.sql
-- Add auth, project permission, project lock, and first admin seed.

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS owner_id INT NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS last_updated_by_user_id INT NULL;

DROP TABLE IF EXISTS project_permissions;
DROP TABLE IF EXISTS project_locks;
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS users;
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
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_tokens_user_id (user_id),
  INDEX idx_auth_tokens_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
);

CREATE TABLE IF NOT EXISTS project_locks (
  project_id INT PRIMARY KEY,
  locked_by_user_id INT NOT NULL,
  locked_by_username VARCHAR(120) NOT NULL,
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  heartbeat_at DATETIME NOT NULL,
  INDEX idx_heartbeat (heartbeat_at),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (locked_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Replace the hash/salt below with production values before deployment.
INSERT INTO users (username, email, display_name, password_hash, password_salt, is_admin)
VALUES (
  'admin',
  'admin',
  'Administrator',
  '78ff996e9c53183955e3ee095202abb08d86193eba5980ff050db0329649c0c30c18f27fad78df27f5d66d1033c0d908f7c74a81990c43f12d5b21c9f75973d7',
  'dev-static-salt-change-me',
  1
)
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  display_name = VALUES(display_name),
  is_admin = VALUES(is_admin);
