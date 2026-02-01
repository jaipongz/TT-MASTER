const fs = require('fs');
const path = require('path');

class MysqlGenerator {
    static async generate(jsonSchema) {
        const baseDir = path.join(
            __dirname,
            '../../temp/migrations'
        );

        fs.mkdirSync(baseDir, { recursive: true });

        const generatedFiles = [];

        for (const module of jsonSchema.module) {
            const tableName = module.tblname;
            const fields = module.fields;

            if (!tableName || !fields) continue;

            const columns = this.generateColumns(fields);
            const sqlBlocks = [];

            // ===== MAIN TABLE =====
            sqlBlocks.push(`
DROP TABLE IF EXISTS \`${tableName}\`;
CREATE TABLE \`${tableName}\` (
  \`${tableName}_id\` BIGINT PRIMARY KEY,
${columns},
  obj_lang VARCHAR(10) NOT NULL,
  obj_content_id INT NOT NULL,
  obj_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  obj_created_by INT NOT NULL,
  obj_published_date TIMESTAMP NULL DEFAULT NULL,
  obj_published_by INT DEFAULT NULL,

  INDEX idx_${tableName}_lang (obj_lang),
  INDEX idx_${tableName}_content (obj_content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `.trim());

            // ===== DRAFT TABLE =====
            sqlBlocks.push(`
DROP TABLE IF EXISTS \`${tableName}_draft\`;
CREATE TABLE \`${tableName}_draft\` (
  \`${tableName}_id\` BIGINT PRIMARY KEY,
${columns},
  obj_status VARCHAR(10) NOT NULL,
  obj_state VARCHAR(10) NOT NULL,
  obj_lang VARCHAR(10) NOT NULL,
  obj_rev INT NOT NULL,
  obj_content_id INT NOT NULL,
  obj_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  obj_created_by INT NOT NULL,
  obj_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  obj_modified_by INT NOT NULL,
  obj_published_date TIMESTAMP NULL DEFAULT NULL,
  obj_published_by INT DEFAULT NULL,

  INDEX idx_${tableName}_draft_status (obj_status),
  INDEX idx_${tableName}_draft_state (obj_state),
  INDEX idx_${tableName}_draft_lang (obj_lang),
  INDEX idx_${tableName}_draft_content (obj_content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `.trim());

            // ===== MEDIA TABLES =====
            sqlBlocks.push(`
DROP TABLE IF EXISTS \`${tableName}_media_file\`;
CREATE TABLE \`${tableName}_media_file\` (
  media_file_id INT AUTO_INCREMENT PRIMARY KEY,
  file_gen VARCHAR(10) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_${tableName}_media_ref (ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `.trim());

            sqlBlocks.push(`
DROP TABLE IF EXISTS \`${tableName}_media_data\`;
CREATE TABLE \`${tableName}_media_data\` (
  media_data_id INT AUTO_INCREMENT PRIMARY KEY,
  file_gen VARCHAR(10) NOT NULL,
  file_data LONGBLOB,

  CONSTRAINT fk_${tableName}_media
    FOREIGN KEY (media_file_id)
    REFERENCES ${tableName}_media_file(media_file_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `.trim());

            // ===== WRITE FILE (overwrite) =====
            const filePath = path.join(baseDir, `${tableName}.sql`);
            fs.writeFileSync(filePath, sqlBlocks.join('\n\n'), 'utf8');

            generatedFiles.push(filePath);
        }

        return {
            success: true,
            files: generatedFiles
        };
    }

    static generateColumns(fields) {
        const columns = [];

        for (const [name, config] of Object.entries(fields)) {
            const notNull = config.required === 'T' ? 'NOT NULL' : 'NULL';

            switch (config.type) {
                case 'image':
                    columns.push(
                        `  \`${name}_gen\` VARCHAR(10) ${notNull}`,
                        `  \`${name}_name\` VARCHAR(255) ${notNull}`,
                        `  \`${name}_alt\` VARCHAR(255) NULL`
                    );
                    break;

                case 'file':
                    columns.push(
                        `  \`${name}_gen\` VARCHAR(10) ${notNull}`,
                        `  \`${name}_name\` VARCHAR(255) ${notNull}`
                    );
                    break;

                default:
                    const type = this.mapType(config);
                    columns.push(
                        `  \`${name}\` ${type} ${notNull}`
                    );
            }
        }

        return columns.join(',\n');
    }


    static mapType(config) {
        const limit = (config.limit || '').split(',')[1] || 255;

        switch (config.type) {
            case 'text':
                return `VARCHAR(${limit})`;
            case 'moretext':
                return 'MEDIUMTEXT';
            case 'fulltext':
                return 'TEXT';
            case 'number':
                return 'INT';
            case 'decimal':
                return 'DECIMAL(10,2)';
            default:
                return 'VARCHAR(255)';
        }
    }

}

module.exports = MysqlGenerator;
