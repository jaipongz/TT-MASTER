const NamingHelper = require('./NamingHelper');

class FieldHelper {
    // Normalize raw JSON schema field config for DTO/entity/UI templates.
    static normalizeFields(fieldsConfig = {}) {
        return Object.entries(fieldsConfig).map(([name, config]) => this.normalizeField(name, config || {}));
    }

    static normalizeField(name, config) {
        const type = String(config.type || 'text').toLowerCase();
        const required = config.required === 'T';
        const propertyName = NamingHelper.camel(name);
        const dtoType = this.mapDtoType(type);
        const lookupMode = this.resolveLookupMode(config.mode);
        const lookupItems = Array.isArray(config.lookup) ? config.lookup : [];
        const dynamicLookup = this.resolveDynamicLookup(lookupItems, config.mode);
        const staticLookupItems = lookupMode === 'static'
            ? lookupItems
                .filter(item => item && (item.value !== undefined || item.label !== undefined))
                .map(item => ({
                    value: String(item.value ?? ''),
                    label: String(item.label ?? item.value ?? '')
                }))
            : [];

        return {
            name,
            label: config.label || NamingHelper.title(name),
            type,
            required,
            propertyName,
            dtoType,
            tsType: dtoType,
            validatorDecorator: this.mapValidatorDecorator(type),
            isTextArea: type === 'moretext' || type === 'fulltext',
            isArray: type === 'checkbox' || type === 'tag',
            isBoolean: type === 'switch',
            isLookup: lookupMode === 'static' || lookupMode === 'dynamic',
            lookupMode,
            staticLookupItems,
            dynamicLookup,
            uiControl: this.mapUiControl(type),
            formType: this.mapFormType(type),
            listType: this.mapListType(type),
            columnType: this.mapEntityColumnType(type),
            nullableText: required ? '' : ', nullable: true'
        };
    }

    static resolveLookupMode(mode) {
        if (typeof mode === 'string') {
            const normalized = mode.trim().toLowerCase();
            if (normalized === 'dynamic' || normalized === 'static') return normalized;
        }

        const type = String(mode?.type || '').trim().toLowerCase();
        if (type === 'lookup') return 'dynamic';
        if (type === 'dynamic' || type === 'static') return type;
        return '';
    }

    static resolveDynamicLookup(lookupItems, mode) {
        const modeText = typeof mode === 'string' ? mode.trim().toLowerCase() : String(mode?.type || '').trim().toLowerCase();
        if (modeText !== 'dynamic' && modeText !== 'lookup') return null;

        const first = lookupItems.find(item => item && item.tbl_name);
        if (!first) return null;

        const orderBy = this.parseSortBy(first.sort_by);
        return {
            tableName: String(first.tbl_name || ''),
            valueColumn: String(first.field_value || 'id'),
            labelColumn: String(first.field_label || first.field_value || 'id'),
            whereSql: String(first.where_sql || ''),
            orderByColumn: orderBy.column,
            orderByDirection: orderBy.direction
        };
    }

    static parseSortBy(sortBy) {
        const raw = String(sortBy || '').trim();
        if (!raw) {
            return { column: 'label', direction: 'ASC' };
        }

        const match = raw.match(/^([a-zA-Z0-9_]+)\s*(asc|desc)?$/i);
        if (!match) {
            return { column: 'label', direction: 'ASC' };
        }

        return {
            column: match[1],
            direction: String(match[2] || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
        };
    }

    static mapFormType(type) {
        switch (type) {
            case 'moretext':
                return 'moretext';
            case 'fulltext':
                return 'fulltext';
            case 'dropdown':
                return 'dropdown';
            case 'radio':
                return 'radio';
            case 'checkbox':
                return 'checkbox';
            case 'switch':
                return 'switch';
            case 'tag':
                return 'tag';
            case 'date':
                return 'date';
            case 'datetime':
                return 'datetime';
            case 'email':
                return 'email';
            case 'number':
            case 'decimal':
                return 'number';
            default:
                return 'text';
        }
    }

    static mapListType(type) {
        switch (type) {
            case 'date':
            case 'datetime':
                return 'datetime';
            case 'number':
            case 'decimal':
                return 'number';
            case 'switch':
                return 'boolean';
            default:
                return 'text';
        }
    }

    static mapDtoType(type) {
        switch (type) {
            case 'number':
            case 'decimal':
                return 'number';
            case 'switch':
                return 'boolean';
            case 'checkbox':
            case 'tag':
                return 'string[]';
            default:
                return 'string';
        }
    }

    static mapUiControl(type) {
        switch (type) {
            case 'moretext':
            case 'fulltext':
                return 'textarea';
            case 'dropdown':
            case 'radio':
            case 'checkbox':
            case 'switch':
            case 'tag':
                return 'select';
            case 'number':
            case 'decimal':
                return 'number';
            case 'date':
                return 'date';
            case 'datetime':
                return 'datetime-local';
            case 'email':
                return 'email';
            default:
                return 'text';
        }
    }

    static mapValidatorDecorator(type) {
        switch (type) {
            case 'number':
            case 'decimal':
                return 'IsInt';
            case 'switch':
                return 'IsBoolean';
            case 'checkbox':
            case 'tag':
                return 'IsArray';
            default:
                return 'IsString';
        }
    }

    static mapEntityColumnType(type) {
        switch (type) {
            case 'number':
                return 'int';
            case 'decimal':
                return 'decimal';
            case 'moretext':
                return 'text';
            case 'fulltext':
                return 'text';
            case 'date':
                return 'date';
            case 'datetime':
                return 'datetime';
            case 'switch':
                return 'tinyint';
            default:
                return 'varchar';
        }
    }
}

module.exports = FieldHelper;
