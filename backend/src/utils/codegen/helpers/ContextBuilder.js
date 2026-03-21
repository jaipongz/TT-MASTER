const NamingHelper = require('./NamingHelper');
const FieldHelper = require('./FieldHelper');
const FeatureHelper = require('./FeatureHelper');
const FormConfigBuilder = require('./FormConfigBuilder');
const ListConfigBuilder = require('./ListConfigBuilder');

class ContextBuilder {
    // Build a normalized module context for all generators/templates.
    static build(moduleConfig = {}) {
        const fileName = NamingHelper.snake(moduleConfig.tblname);
        const EntityName = NamingHelper.pascal(moduleConfig.tblname);
        const camelName = NamingHelper.camel(moduleConfig.tblname);
        const fieldList = FieldHelper.normalizeFields(moduleConfig.fields || {});
        const features = FeatureHelper.build(moduleConfig);

        const uiListConfigName = `${camelName}ListConfig`;
        const uiFormConfigName = `${camelName}FormConfig`;
        const uiCustomListConfigName = `${camelName}CustomListConfig`;
        const uiCustomFormConfigName = `${camelName}CustomFormConfig`;
        const uiPageClassName = `${EntityName}`;
        const formConfigJson = FormConfigBuilder.build(moduleConfig);
        const listConfigJson = ListConfigBuilder.build(moduleConfig, fieldList);

        const childCollections = Object.entries(moduleConfig.childs || {})
            .filter(([, child]) => child?.type === 'child')
            .map(([childName, child]) => ({
                childName: NamingHelper.snake(childName),
                childCamelName: NamingHelper.camel(childName),
                ChildEntityName: NamingHelper.pascal(childName),
                childTitle: child.title || NamingHelper.title(childName),
                fields: FieldHelper.normalizeFields(child.fields || {})
            }));

        const galleryCollections = Object.entries(moduleConfig.childs || {})
            .filter(([, child]) => child?.type === 'gallery')
            .map(([childName, child]) => ({
                childName: NamingHelper.snake(childName),
                childCamelName: NamingHelper.camel(childName),
                ChildEntityName: NamingHelper.pascal(childName),
                childTitle: child.title || NamingHelper.title(childName)
            }));

        const moduleEntities = [
            {
                entityName: EntityName,
                fileName,
                isDraft: false
            },
            {
                entityName: `${EntityName}Draft`,
                fileName: `${fileName}-draft`,
                isDraft: true
            },
            ...childCollections.flatMap(child => ([
                {
                    entityName: child.ChildEntityName,
                    fileName: child.childName,
                    isDraft: false
                },
                {
                    entityName: `${child.ChildEntityName}Draft`,
                    fileName: `${child.childName}-draft`,
                    isDraft: true
                }
            ])),
            ...galleryCollections.flatMap(child => ([
                {
                    entityName: child.ChildEntityName,
                    fileName: child.childName,
                    isDraft: false
                },
                {
                    entityName: `${child.ChildEntityName}Draft`,
                    fileName: `${child.childName}-draft`,
                    isDraft: true
                }
            ]))
        ];

        const fields = {};
        for (const field of fieldList) {
            fields[field.name] = {
                tsType: field.tsType,
                isTextArea: field.isTextArea
            };
        }

        return {
            moduleConfig,
            features,
            fieldList,
            childCollections,
            galleryCollections,
            moduleEntities,
            fields,
            EntityName,
            ControllerName: `${EntityName}Controller`,
            ServiceName: `${EntityName}Service`,
            ModuleName: `${EntityName}Module`,
            CreateDtoName: `Create${EntityName}Dto`,
            UpdateDtoName: `Update${EntityName}Dto`,
            fileName,
            routeName: fileName,
            camelName,
            uiListConfigName,
            uiFormConfigName,
            uiCustomListConfigName,
            uiCustomFormConfigName,
            uiPageClassName,
            moduleTitle: moduleConfig.title || NamingHelper.title(moduleConfig.tblname),
            formConfigJson,
            listConfigJson
        };
    }
}

module.exports = ContextBuilder;
