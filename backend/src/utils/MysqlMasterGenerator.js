class MysqlMasterGenerator {
    static generate() {
        return [
            this.cmsUser(),
            this.cmsPermission(),
            this.cmsConfig()
        ].join('\n\n');
    }

    static cmsUser() {
        return `
CREATE TABLE IF NOT EXISTS cms_user (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `.trim();
    }

    static cmsPermission() {
        return `
CREATE TABLE IF NOT EXISTS cms_permission (
  permission_id BIGINT UNSIGNED PRIMARY KEY,
  permission_key VARCHAR(100) NOT NULL,
  permission_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_permission_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `.trim();
    }

    static cmsConfig() {
        return `
CREATE TABLE IF NOT EXISTS cms_config (
  config_key VARCHAR(100) PRIMARY KEY,
  config_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `.trim();
    }
}

module.exports = MysqlMasterGenerator;
