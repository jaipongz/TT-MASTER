// backend/src/utils/CodeGenerator.js
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const ContextBuilder = require('./codegen/helpers/ContextBuilder');
const OutputPlanner = require('./codegen/OutputPlanner');
const AppModuleUpdater = require('./codegen/AppModuleUpdater');

class CodeGenerator {
    // Orchestrate template rendering for API/UI and module registration.
    static async generate(schema, options = {}) {
        const generatedFiles = [];
        const workspaceDir =
            options.workspaceDir ||
            path.join(__dirname, '../../temp/default-project');

        const apiTemplateDir = path.join(__dirname, '../../templates/hbs/api');
        const uiTemplateDir = path.join(__dirname, '../../templates/hbs/ui');

        const apiBaseDir = path.join(
            workspaceDir,
            'api/src/modules'
        );

        const uiBaseDir = path.join(
            workspaceDir,
            'ui'
        );

        fs.mkdirSync(apiBaseDir, { recursive: true });
        fs.mkdirSync(uiBaseDir, { recursive: true });

        for (const module of schema.module) {
            const context = ContextBuilder.build(module);
            const outputPlan = OutputPlanner.plan(context);

            for (const item of outputPlan) {
                const templateDir = item.templateType === 'api'
                    ? apiTemplateDir
                    : uiTemplateDir;

                const baseOutDir = item.templateType === 'api'
                    ? apiBaseDir
                    : uiBaseDir;

                const outDir = path.join(baseOutDir, item.outDir);
                fs.mkdirSync(outDir, { recursive: true });

                generatedFiles.push(
                    this.render(
                        templateDir,
                        item.templateFile,
                        outDir,
                        item.outFile,
                        item.context
                    )
                );
            }

            AppModuleUpdater.registerModule({ workspaceDir, context });
        }

        return {
            success: true,
            files: generatedFiles
        };
    }

    // ================= helpers =================

    static render(templateDir, templateFile, outDir, outFile, context) {
        const tplPath = path.join(templateDir, templateFile);
        const tplSource = fs.readFileSync(tplPath, 'utf8');
        const template = Handlebars.compile(tplSource);

        const content = template(context);

        const filePath = path.join(outDir, outFile);
        fs.writeFileSync(filePath, content, 'utf8');

        return filePath;
    }

}

module.exports = CodeGenerator;
