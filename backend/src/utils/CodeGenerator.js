// backend/src/utils/CodeGenerator.js
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

class CodeGenerator {
    static async generate(schema) {
        const generatedFiles = [];

        const apiTemplateDir = path.join(__dirname, '../../templates/hbs/api');
        const uiTemplateDir = path.join(__dirname, '../../templates/hbs/ui');

        const apiBaseDir = path.join(
            __dirname,
            '../../temp/api/src/modules'
        );

        const uiBaseDir = path.join(
            __dirname,
            '../../temp/ui/app/modules'
        );

        fs.mkdirSync(apiBaseDir, { recursive: true });
        fs.mkdirSync(uiBaseDir, { recursive: true });

        for (const module of schema.module) {
            const context = this.buildContext(module);

            const moduleApiDir = path.join(apiBaseDir, context.fileName);
            const moduleUiDir = path.join(uiBaseDir, context.fileName);

            fs.mkdirSync(moduleApiDir, { recursive: true });
            fs.mkdirSync(moduleUiDir, { recursive: true });

            // ===== API =====
            generatedFiles.push(
                this.render(
                    apiTemplateDir,
                    'controller.hbs',
                    moduleApiDir,
                    `${context.fileName}.controller.ts`,
                    context
                )
            );

            generatedFiles.push(
                this.render(
                    apiTemplateDir,
                    'service.hbs',
                    moduleApiDir,
                    `${context.fileName}.service.ts`,
                    context
                )
            );

            generatedFiles.push(
                this.render(
                    apiTemplateDir,
                    'module.hbs',
                    moduleApiDir,
                    `${context.fileName}.module.ts`,
                    context
                )
            );

            generatedFiles.push(
                this.render(
                    apiTemplateDir,
                    'dto.hbs',
                    moduleApiDir,
                    `dto.ts`,
                    context
                )
            );

            // ===== UI =====
            generatedFiles.push(
                this.render(
                    uiTemplateDir,
                    'list.tsx.hbs',
                    moduleUiDir,
                    `page.tsx`,
                    context
                )
            );

            generatedFiles.push(
                this.render(
                    uiTemplateDir,
                    'form.tsx.hbs',
                    moduleUiDir,
                    `form.tsx`,
                    context
                )
            );

            generatedFiles.push(
                this.render(
                    uiTemplateDir,
                    'api.ts.hbs',
                    moduleUiDir,
                    `api.ts`,
                    context
                )
            );
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

    static buildContext(module) {
        const entityName = this.pascal(module.tblname);
        const fileName = this.kebab(module.tblname);

        return {
            EntityName: entityName,
            ControllerName: `${entityName}Controller`,
            ServiceName: `${entityName}Service`,
            ModuleName: `${entityName}Module`,
            fileName,
            routeName: fileName,
            camelName: this.camel(module.tblname),
            fields: this.mapFields(module.fields || {})
        };
    }

    static mapFields(fields) {
        const result = {};
        for (const [name, config] of Object.entries(fields)) {
            result[name] = {
                tsType: this.mapTsType(config.type),
                isTextArea: config.type === 'moretext'
            };
        }
        return result;
    }

    static mapTsType(type) {
        switch (type) {
            case 'number':
            case 'decimal':
                return 'number';
            default:
                return 'string';
        }
    }

    // ===== naming utils =====
    static pascal(str) {
        return str
            .split('_')
            .map(s => s.charAt(0).toUpperCase() + s.slice(1))
            .join('');
    }

    static camel(str) {
        const p = this.pascal(str);
        return p.charAt(0).toLowerCase() + p.slice(1);
    }

    static kebab(str) {
        return str.replace(/_/g, '-');
    }
}

module.exports = CodeGenerator;
