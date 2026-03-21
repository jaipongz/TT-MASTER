class FeatureHelper {
    // Infer module capabilities so templates can toggle optional sections.
    static build(moduleConfig = {}) {
        const fields = Object.values(moduleConfig.fields || {});
        const childs = Object.values(moduleConfig.childs || {});

        const hasLookupFields = fields.some(field => field?.mode?.type === 'lookup');
        const hasChildCollections = childs.some(item => item?.type === 'child');
        const hasGalleryCollections = childs.some(item => item?.type === 'gallery');

        const isDynamic =
            moduleConfig.approval_mode === 'On' ||
            moduleConfig.preview_mode === 'On' ||
            Boolean(moduleConfig.export?.type) ||
            hasLookupFields;

        return {
            isDynamic,
            hasLookupFields,
            hasChildCollections,
            hasGalleryCollections,
            hasSeoMetaTag: moduleConfig.seo_meta_tag === 'T',
            hasExport: Boolean(moduleConfig.export?.type),
            hasPublishAction: isDynamic,
            hasListActions: isDynamic,
            hasRevisions: isDynamic
        };
    }
}

module.exports = FeatureHelper;
