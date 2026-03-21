const fs = require('fs');
const path = require('path');
const MysqlMasterGenerator = require('./MysqlMasterGenerator');

class MysqlGenerator {
    static async generate(jsonSchema, options = {}) {
        const workspaceDir =
            options.workspaceDir ||
            path.join(__dirname, '../../temp/default-project');

        const baseDir = path.join(
            workspaceDir,
            'migrations'
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
  \`${tableName}_id\` BIGINT,
${columns},
  obj_lang VARCHAR(10) NOT NULL,
  obj_content_id BIGINT NOT NULL,
  obj_created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  obj_created_by INT NOT NULL,
  obj_published_date DATETIME  NULL DEFAULT NULL,
  obj_published_by INT DEFAULT NULL,
  
  PRIMARY KEY (${tableName}_id, obj_lang),
  INDEX idx_${tableName}_lang (obj_lang),
  INDEX idx_${tableName}_content (obj_content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `.trim());

            // ===== DRAFT TABLE =====
            sqlBlocks.push(`
DROP TABLE IF EXISTS \`${tableName}_draft\`;
CREATE TABLE \`${tableName}_draft\` (
  \`${tableName}_id\` BIGINT NOT NULL,
${columns},
  obj_status VARCHAR(10) NOT NULL,
  obj_state VARCHAR(10) NOT NULL,
  obj_lang VARCHAR(10) NOT NULL,
  obj_rev INT NOT NULL,
  obj_content_id BIGINT NOT NULL,
  obj_created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  obj_created_by INT NOT NULL,
  obj_modified_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  obj_modified_by INT NOT NULL,
  obj_published_date DATETIME NULL DEFAULT NULL,
  obj_published_by INT DEFAULT NULL,

  PRIMARY KEY (${tableName}_id, obj_lang, obj_rev),
  INDEX idx_${tableName}_draft_status (obj_status),
  INDEX idx_${tableName}_draft_state (obj_state),
  INDEX idx_${tableName}_draft_lang (obj_lang),
  INDEX idx_${tableName}_draft_content (obj_content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `.trim());

            // ===== CHILD TABLES (append into same module file) =====
            const childSqlBlocks = this.generateChildTables(module);
            sqlBlocks.push(...childSqlBlocks);

            // ===== MODULE PERMISSION SEEDER =====
            sqlBlocks.push(this.buildPermissionSeeder(module));


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

        static generateChildTables(module) {
            const childSqlBlocks = [];
                const childs = module.childs || {};

                for (const [childName, childConfig] of Object.entries(childs)) {
                        if (!childConfig || typeof childConfig !== 'object') continue;

                        if (childConfig.type === 'gallery') {
                    childSqlBlocks.push(this.buildGalleryChildSql(childName));
                        }

                        if (childConfig.type === 'child') {
                                const childFields = childConfig.fields || {};
                    childSqlBlocks.push(
                        this.buildStandardChildSql(childName, childFields)
                    );
                        }
                }

            return childSqlBlocks;
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
    obj_lang VARCHAR(10) NOT NULL,
    obj_created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    obj_created_by INT NOT NULL,
    
    INDEX idx_${childName}_parent (obj_parent_id),
    INDEX idx_${childName}_priority (obj_priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS \`${childName}_draft\`;
CREATE TABLE \`${childName}_draft\` (
    \`${childName}_id\` BIGINT NOT NULL,
    obj_parent_id BIGINT NOT NULL,
    obj_file VARCHAR(255) NOT NULL,
    obj_file_gen VARCHAR(10) NOT NULL,
    obj_priority INT NOT NULL DEFAULT 0,
    obj_lang VARCHAR(10) NOT NULL,
    obj_rev INT NOT NULL,
    obj_created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    obj_created_by INT NOT NULL,

    PRIMARY KEY (${childName}_id, obj_lang, obj_rev),
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
    obj_content_id BIGINT NOT NULL,
    obj_created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    obj_created_by INT NOT NULL,
    obj_published_date DATETIME NULL DEFAULT NULL,
    obj_published_by INT DEFAULT NULL,

    INDEX idx_${childName}_parent (obj_parent_id),
    INDEX idx_${childName}_lang (obj_lang),
    INDEX idx_${childName}_content (obj_content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS \`${childName}_draft\`;
CREATE TABLE \`${childName}_draft\` (
    \`${childName}_id\` BIGINT NOT NULL,
${columns ? `${columns},\n` : ''}  obj_parent_id BIGINT NOT NULL,
    obj_status VARCHAR(10) NOT NULL,
    obj_state VARCHAR(10) NOT NULL,
    obj_lang VARCHAR(10) NOT NULL,
    obj_rev INT NOT NULL,
    obj_content_id BIGINT NOT NULL,
    obj_created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    obj_created_by INT NOT NULL,
    obj_modified_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    obj_modified_by INT NOT NULL,
    obj_published_date DATETIME NULL DEFAULT NULL,
    obj_published_by INT DEFAULT NULL,
    
    PRIMARY KEY (${childName}_id, obj_lang, obj_rev),
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

    static buildPermissionSeeder(module) {
        const tableName = module.tblname;
        const moduleKey = (module.permission_prefix || tableName || '').toLowerCase();
        const moduleName = module.title || 'Module';
        const tableNameSql = this.escapeSqlValue(tableName);
        const moduleNameSql = this.escapeSqlValue(moduleName);
        const actions = ['create', 'read', 'update', 'delete'];

        if (this.isDynamicModule(module)) {
            actions.push('export', 'publish');
        }

        const permissionRows = actions
            .map(action => {
                const permissionName = `${moduleKey}.${action}`;
                const description = `Can ${action} ${tableName}`;
                return `('${this.escapeSqlValue(permissionName)}', '${this.escapeSqlValue(description)}', '${tableNameSql}', '${moduleNameSql}', '${this.escapeSqlValue(action)}')`;
            })
            .join(',\n');

        const permissionNames = actions
            .map(action => `'${this.escapeSqlValue(`${moduleKey}.${action}`)}'`)
            .join(', ');

        return `
-- Module permissions: ${tableName}
DELETE rp
FROM \`wcm_role_permissions\` rp
INNER JOIN \`wcm_permissions\` p ON p.id = rp.permission_id
WHERE p.\`module\` = '${tableNameSql}';

DELETE FROM \`wcm_permissions\` WHERE \`module\` = '${tableNameSql}';
INSERT IGNORE INTO \`wcm_permissions\` (\`name\`, \`description\`, \`module\`, \`module_name\`, \`action\`) VALUES
${permissionRows};

INSERT IGNORE INTO \`wcm_role_permissions\` (\`role_id\`, \`permission_id\`)
SELECT 1, p.id
FROM \`wcm_permissions\` p
WHERE p.name IN (${permissionNames});
        `.trim();
    }

    static escapeSqlValue(value) {
        return String(value ?? '').replace(/'/g, "''");
    }

    static isDynamicModule(module) {
        if (module?.approval_mode === 'On' || module?.preview_mode === 'On') {
            return true;
        }

        if (module?.export?.type) {
            return true;
        }

        const fields = module?.fields || {};
        return Object.values(fields).some(field => field?.mode?.type === 'lookup');
    }

}

module.exports = MysqlGenerator;
