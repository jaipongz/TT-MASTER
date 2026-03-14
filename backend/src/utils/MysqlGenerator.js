const fs = require('fs');
const path = require('path');
const MysqlMasterGenerator = require('./MysqlMasterGenerator');

class MysqlGenerator {
    static async generate(jsonSchema) {
        const baseDir = path.join(
            __dirname,
            '../../temp/migrations'
        );

        fs.mkdirSync(baseDir, { recursive: true });

        const masterSql = MysqlMasterGenerator.generate();
        const masterFilePath = path.join(baseDir, '_master.sql');
        fs.writeFileSync(masterFilePath, masterSql, 'utf8');
        
        const generatedFiles = [masterFilePath];

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
  obj_content_id BIGINT NOT NULL,
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
  obj_content_id BIGINT NOT NULL,
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


            // ===== WRITE FILE (overwrite) =====
            const filePath = path.join(baseDir, `${tableName}.sql`);
            fs.writeFileSync(filePath, sqlBlocks.join('\n\n'), 'utf8');

            generatedFiles.push(filePath);

            const childFiles = this.generateChildTables(baseDir, module);
            generatedFiles.push(...childFiles);
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
                        `  \`${name}\` VARCHAR(255) ${notNull}`,
                        `  \`${name}_gen\` VARCHAR(10) ${notNull}`,
                        `  \`${name}_alt\` VARCHAR(255) NULL`
                    );
                    break;
                case 'video':
                    columns.push(
                        `  \`${name}\` VARCHAR(255) ${notNull}`,
                        `  \`${name}_gen\` VARCHAR(10) ${notNull}`
                    );
                    break;

                case 'file':
                    columns.push(
                        `  \`${name}\` VARCHAR(255) ${notNull}`,
                        `  \`${name}_gen\` VARCHAR(10) ${notNull}`
                    );
                    break;

                case 'fulltext':
                    columns.push(
                        `  \`${name}\` TEXT ${notNull}`,
                        `  \`${name}_plain\` TEXT ${notNull}`
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

        static generateChildTables(baseDir, module) {
                const childFiles = [];
                const childs = module.childs || {};

                for (const [childName, childConfig] of Object.entries(childs)) {
                        if (!childConfig || typeof childConfig !== 'object') continue;

                        if (childConfig.type === 'gallery') {
                                const filePath = path.join(baseDir, `${childName}.sql`);
                                fs.writeFileSync(
                                        filePath,
                                        this.buildGalleryChildSql(childName),
                                        'utf8'
                                );
                                childFiles.push(filePath);
                        }

                        if (childConfig.type === 'child') {
                                const childFields = childConfig.fields || {};
                                const filePath = path.join(baseDir, `${childName}.sql`);
                                fs.writeFileSync(
                                        filePath,
                                        this.buildStandardChildSql(childName, childFields),
                                        'utf8'
                                );
                                childFiles.push(filePath);
                        }
                }

                return childFiles;
        }

        static buildGalleryChildSql(childName) {
                return `
DROP TABLE IF EXISTS \`${childName}\`;
CREATE TABLE \`${childName}\` (
    \`${childName}_id\` BIGINT PRIMARY KEY,
    obj_parent_id BIGINT NOT NULL,
    obj_file VARCHAR(255) NOT NULL,
    obj_file_gen VARCHAR(10) NOT NULL,
    obj_priority INT NOT NULL DEFAULT 0,
    obj_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    obj_created_by INT NOT NULL,

    INDEX idx_${childName}_parent (obj_parent_id),
    INDEX idx_${childName}_priority (obj_priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS \`${childName}_draft\`;
CREATE TABLE \`${childName}_draft\` (
    \`${childName}_id\` BIGINT PRIMARY KEY,
    obj_parent_id BIGINT NOT NULL,
    obj_file VARCHAR(255) NOT NULL,
    obj_file_gen VARCHAR(10) NOT NULL,
    obj_priority INT NOT NULL DEFAULT 0,
    obj_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    obj_created_by INT NOT NULL,

    INDEX idx_${childName}_draft_parent (obj_parent_id),
    INDEX idx_${childName}_draft_priority (obj_priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                `.trim();
        }

        static buildStandardChildSql(childName, fields) {
                const columns = this.generateColumns(fields);

                return `
DROP TABLE IF EXISTS \`${childName}\`;
CREATE TABLE \`${childName}\` (
    \`${childName}_id\` BIGINT PRIMARY KEY,
${columns ? `${columns},\n` : ''}  obj_parent_id BIGINT NOT NULL,
    obj_lang VARCHAR(10) NOT NULL,
    obj_content_id INT NOT NULL,
    obj_created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    obj_created_by INT NOT NULL,
    obj_published_date TIMESTAMP NULL DEFAULT NULL,
    obj_published_by INT DEFAULT NULL,

    INDEX idx_${childName}_parent (obj_parent_id),
    INDEX idx_${childName}_lang (obj_lang),
    INDEX idx_${childName}_content (obj_content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS \`${childName}_draft\`;
CREATE TABLE \`${childName}_draft\` (
    \`${childName}_id\` BIGINT PRIMARY KEY,
${columns ? `${columns},\n` : ''}  obj_parent_id BIGINT NOT NULL,
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

    INDEX idx_${childName}_draft_parent (obj_parent_id),
    INDEX idx_${childName}_draft_status (obj_status),
    INDEX idx_${childName}_draft_state (obj_state),
    INDEX idx_${childName}_draft_lang (obj_lang),
    INDEX idx_${childName}_draft_content (obj_content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                `.trim();
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
