const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

class SetupGenerator {
    static async generateBaseFiles(projectName, schema) {
        const repoDir = path.join(__dirname, '../../../temp/_repo');
        
        // สร้างโครงสร้าง directory
        const dirs = [
            repoDir,
            path.join(repoDir, 'api/src'),
            path.join(repoDir, 'api/src/config'),
            path.join(repoDir, 'api/src/common'),
            path.join(repoDir, 'api/src/common/interceptors'),
            path.join(repoDir, 'api/src/common/filters'),
            path.join(repoDir, 'api/src/common/guards'),
            path.join(repoDir, 'api/src/common/decorators'),
            path.join(repoDir, 'ui/app'),
            path.join(repoDir, 'ui/app/layout'),
            path.join(repoDir, 'ui/app/api'),
            path.join(repoDir, 'ui/components'),
            path.join(repoDir, 'ui/lib'),
            path.join(repoDir, 'ui/styles'),
            path.join(repoDir, 'migrations'),
            path.join(repoDir, 'docker'),
            path.join(repoDir, 'scripts'),
        ];

        dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

        const templatesDir = path.join(__dirname, '../../templates');
        const context = {
            projectName,
            projectNameKebab: projectName.toLowerCase().replace(/\s+/g, '-'),
            projectNameCamel: projectName.replace(/\s+/g, ''),
            apiPort: 3001,
            uiPort: 3000,
            dbName: projectName.toLowerCase().replace(/\s+/g, '_'),
            modules: schema?.module || []
        };

        // ===== ROOT FILES =====
        this.renderTemplate(
            path.join(templatesDir, 'root/package.json.hbs'),
            path.join(repoDir, 'package.json'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'root/README.md.hbs'),
            path.join(repoDir, 'README.md'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'root/.gitignore.hbs'),
            path.join(repoDir, '.gitignore'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'root/docker-compose.yml.hbs'),
            path.join(repoDir, 'docker-compose.yml'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'root/Makefile.hbs'),
            path.join(repoDir, 'Makefile'),
            context
        );

        // ===== API BASE FILES =====
        this.renderTemplate(
            path.join(templatesDir, 'api/base/main.ts.hbs'),
            path.join(repoDir, 'api/src/main.ts'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/app.module.ts.hbs'),
            path.join(repoDir, 'api/src/app.module.ts'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/app.service.ts.hbs'),
            path.join(repoDir, 'api/src/app.service.ts'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/app.controller.ts.hbs'),
            path.join(repoDir, 'api/src/app.controller.ts'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/config/database.config.ts.hbs'),
            path.join(repoDir, 'api/src/config/database.config.ts'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/package.json.hbs'),
            path.join(repoDir, 'api/package.json'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/tsconfig.json.hbs'),
            path.join(repoDir, 'api/tsconfig.json'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/nest-cli.json.hbs'),
            path.join(repoDir, 'api/nest-cli.json'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'api/base/.env.example.hbs'),
            path.join(repoDir, 'api/.env.example'),
            context
        );

        // ===== UI BASE FILES =====
        this.renderTemplate(
            path.join(templatesDir, 'ui/base/next.config.js.hbs'),
            path.join(repoDir, 'ui/next.config.js'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'ui/base/package.json.hbs'),
            path.join(repoDir, 'ui/package.json'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'ui/base/tsconfig.json.hbs'),
            path.join(repoDir, 'ui/tsconfig.json'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'ui/base/tailwind.config.js.hbs'),
            path.join(repoDir, 'ui/tailwind.config.js'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'ui/base/.env.example.hbs'),
            path.join(repoDir, 'ui/.env.example'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'ui/base/layout.tsx.hbs'),
            path.join(repoDir, 'ui/app/layout.tsx'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'ui/base/page.tsx.hbs'),
            path.join(repoDir, 'ui/app/page.tsx'),
            context
        );

        this.renderTemplate(
            path.join(templatesDir, 'ui/base/globals.css.hbs'),
            path.join(repoDir, 'ui/app/globals.css'),
            context
        );

        // ===== SCRIPTS =====
        this.renderTemplate(
            path.join(templatesDir, 'root/scripts/setup.sh.hbs'),
            path.join(repoDir, 'scripts/setup.sh'),
            context
        );

        fs.chmodSync(path.join(repoDir, 'scripts/setup.sh'), '755');

        return {
            success: true,
            message: 'Base files generated successfully'
        };
    }

    static renderTemplate(templatePath, outputPath, context) {
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const template = Handlebars.compile(templateSource);
        const content = template(context);
        fs.writeFileSync(outputPath, content, 'utf8');
    }
}

module.exports = SetupGenerator;