const MysqlGenerator = require('./MysqlGenerator');

class MigrationGenerator {
    static async generateMigration(jsonSchema) {
        const dbType = jsonSchema.database;

        if (dbType !== 'mysql') {
            throw new Error(`Database ${dbType} is not supported yet`);
        }

        return MysqlGenerator.generate(jsonSchema);
    }
}

module.exports = MigrationGenerator;
