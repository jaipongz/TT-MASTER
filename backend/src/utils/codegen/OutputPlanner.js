class OutputPlanner {
    // Define all files generated per module.
    static plan(context) {
        const apiDir = context.fileName;
        const outputs = [
            {
                templateType: 'api',
                templateFile: 'controller.hbs',
                outDir: apiDir,
                outFile: `${context.fileName}.controller.ts`,
                context
            },
            {
                templateType: 'api',
                templateFile: 'service.hbs',
                outDir: apiDir,
                outFile: `${context.fileName}.service.ts`,
                context
            },
            {
                templateType: 'api',
                templateFile: 'module.hbs',
                outDir: apiDir,
                outFile: `${context.fileName}.module.ts`,
                context
            },
            {
                templateType: 'api',
                templateFile: 'create-dto.hbs',
                outDir: `${apiDir}/dto`,
                outFile: `create-${context.fileName}.dto.ts`,
                context
            },
            {
                templateType: 'api',
                templateFile: 'update-dto.hbs',
                outDir: `${apiDir}/dto`,
                outFile: `update-${context.fileName}.dto.ts`,
                context
            },
            {
                templateType: 'api',
                templateFile: 'entity.hbs',
                outDir: apiDir,
                outFile: `${context.fileName}.entity.ts`,
                context
            },
            {
                templateType: 'api',
                templateFile: 'draft-entity.hbs',
                outDir: apiDir,
                outFile: `${context.fileName}-draft.entity.ts`,
                context
            },
            {
                templateType: 'ui',
                templateFile: 'list-config.ts.hbs',
                outDir: 'config/lists',
                outFile: `${context.uiListConfigName}.ts`,
                context
            },
            {
                templateType: 'ui',
                templateFile: 'list-custom-config.ts.hbs',
                outDir: 'config/lists/custom',
                outFile: `${context.uiCustomListConfigName}.ts`,
                context
            },
            {
                templateType: 'ui',
                templateFile: 'form-config.ts.hbs',
                outDir: 'config/forms',
                outFile: `${context.uiFormConfigName}.ts`,
                context
            },
            {
                templateType: 'ui',
                templateFile: 'form-custom-config.ts.hbs',
                outDir: 'config/forms/custom',
                outFile: `${context.uiCustomFormConfigName}.ts`,
                context
            },
            {
                templateType: 'ui',
                templateFile: 'page-index.tsx.hbs',
                outDir: `pages/${context.fileName}`,
                outFile: 'index.tsx',
                context
            },
            {
                templateType: 'ui',
                templateFile: 'page-detail.tsx.hbs',
                outDir: `pages/${context.fileName}`,
                outFile: '[id].tsx',
                context
            }
        ];

        for (const child of context.childCollections) {
            outputs.push(
                {
                    templateType: 'api',
                    templateFile: 'entity.hbs',
                    outDir: apiDir,
                    outFile: `${child.childName}.entity.ts`,
                    context: {
                        ...context,
                        EntityName: child.ChildEntityName,
                        fileName: child.childName,
                        camelName: this.toCamel(child.childName),
                        fieldList: child.fields
                    }
                },
                {
                    templateType: 'api',
                    templateFile: 'draft-entity.hbs',
                    outDir: apiDir,
                    outFile: `${child.childName}-draft.entity.ts`,
                    context: {
                        ...context,
                        EntityName: child.ChildEntityName,
                        fileName: child.childName,
                        camelName: this.toCamel(child.childName),
                        fieldList: child.fields
                    }
                }
            );
        }

        for (const gallery of context.galleryCollections) {
            outputs.push(
                {
                    templateType: 'api',
                    templateFile: 'gallery-entity.hbs',
                    outDir: apiDir,
                    outFile: `${gallery.childName}.entity.ts`,
                    context: {
                        ...context,
                        EntityName: gallery.ChildEntityName,
                        fileName: gallery.childName,
                        camelName: this.toCamel(gallery.childName)
                    }
                },
                {
                    templateType: 'api',
                    templateFile: 'gallery-draft-entity.hbs',
                    outDir: apiDir,
                    outFile: `${gallery.childName}-draft.entity.ts`,
                    context: {
                        ...context,
                        EntityName: gallery.ChildEntityName,
                        fileName: gallery.childName,
                        camelName: this.toCamel(gallery.childName)
                    }
                }
            );
        }

        return outputs;
    }

    static toCamel(value) {
        const parts = String(value || '').split('_').filter(Boolean);
        if (parts.length === 0) return '';
        return parts
            .map((part, index) => {
                if (index === 0) return part;
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join('');
    }
}

module.exports = OutputPlanner;
