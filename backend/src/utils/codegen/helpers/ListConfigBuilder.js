const NamingHelper = require('./NamingHelper');

class ListConfigBuilder {
    // Build UI list config from dynamic module schema (list section + field types).
    static build(moduleConfig = {}, fieldList = []) {
        const fileName = String(moduleConfig.tblname || '').trim();
        const listConfig = moduleConfig.list || {};
        const columnsConfig = Array.isArray(listConfig?.data?.column) ? listConfig.data.column : [];

        const fieldMap = new Map(fieldList.map((field) => [field.name, field]));
        const columns = columnsConfig.length > 0
            ? columnsConfig.map((column) => this.buildColumn(column, fieldMap))
            : fieldList.map((field) => ({
                field: field.name,
                name: field.label,
                type: field.listType,
                width: 140,
                sort: true,
            }));

        const filters = this.buildFilters(listConfig?.filter?.fields, columns, fieldMap, fileName);

        const output = {
            title: moduleConfig.title || NamingHelper.title(fileName),
            endpoint: `/${fileName}`,
            serverSide: true,
            keywords: String(listConfig?.filter?.keywordfields || fieldList.map((f) => f.name).join(',')),
            ...(filters.length > 0 ? { filters } : {}),
            export: Boolean(moduleConfig?.export?.type),
            select: true,
            scroll: true,
            limit: this.toNumber(listConfig?.item_per_page, 15),
            createHref: `/${fileName}/new?mode=add`,
            rowKey: `${NamingHelper.camel(fileName)}Id`,
            columns,
        };

        return this.toTsLiteral(output);
    }

    static buildColumn(columnConfig, fieldMap) {
        const field = String(columnConfig?.field || '').trim();
        const mappedField = fieldMap.get(field);
        const label = String(columnConfig?.label || mappedField?.label || NamingHelper.title(field));

        return {
            field,
            name: label,
            type: this.resolveColumnType(field, mappedField),
            width: this.toNumber(columnConfig?.width, 120),
            sort: String(columnConfig?.sortable || 'T') === 'T',
        };
    }

    static buildFilters(rawFields, columns, fieldMap, fileName) {
        const keys = String(rawFields || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

        return keys
            .filter((key) => fieldMap.get(key)?.isLookup)
            .map((key) => {
                const columnLabel = columns.find((col) => col.field === key)?.name;
                const fieldLabel = fieldMap.get(key)?.label;
                return {
                    key,
                    label: columnLabel || fieldLabel || NamingHelper.title(key),
                    lookup: {
                        endpoint: `/${fileName}/lookup`,
                        field: key,
                    },
                };
            });
    }

    static resolveColumnType(field, mappedField) {
        if (mappedField) {
            const rawType = String(mappedField.type || '').toLowerCase();
            if (rawType === 'image') return 'image';
            if (rawType === 'video') return 'video';
            if (rawType === 'datetime' || rawType === 'date') return 'datetime';
            if (rawType === 'number' || rawType === 'decimal') return 'number';
            return 'text';
        }

        if (field === 'obj_modified_date' || field === 'obj_created_date' || field === 'obj_published_date') {
            return 'datetime';
        }

        return 'text';
    }

    static toNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    static toTsLiteral(value, indentLevel = 0, parentKey = '') {
        const indent = '  '.repeat(indentLevel);
        const nextIndent = '  '.repeat(indentLevel + 1);

        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';

            const lines = value.map((item) => {
                if ((parentKey === 'columns' || parentKey === 'fields') && this.canInlineObject(item)) {
                    return `${nextIndent}${this.inlineObject(item)},`;
                }
                return `${nextIndent}${this.toTsLiteral(item, indentLevel + 1)},`;
            });

            return `\n${lines.join('\n')}\n${indent}`;
        }

        if (value && typeof value === 'object') {
            const entries = Object.entries(value);
            if (entries.length === 0) return '{}';

            const lines = entries.map(([key, val]) => {
                if (Array.isArray(val)) {
                    return `${nextIndent}${this.formatKey(key)}: [${this.toTsLiteral(val, indentLevel + 1, key)}],`;
                }
                return `${nextIndent}${this.formatKey(key)}: ${this.toTsLiteral(val, indentLevel + 1, key)},`;
            });

            return `{\n${lines.join('\n')}\n${indent}}`;
        }

        if (typeof value === 'string') return this.quote(value);
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (value === null) return 'null';
        return 'undefined';
    }

    static canInlineObject(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        return Object.values(value).every((item) => {
            if (item === null) return true;
            const type = typeof item;
            return type === 'string' || type === 'number' || type === 'boolean';
        });
    }

    static inlineObject(obj) {
        const parts = Object.entries(obj).map(([key, val]) => `${this.formatKey(key)}: ${this.inlineValue(val)}`);
        return `{ ${parts.join(', ')} }`;
    }

    static inlineValue(val) {
        if (typeof val === 'string') return this.quote(val);
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        if (val === null) return 'null';
        return this.toTsLiteral(val, 0);
    }

    static formatKey(key) {
        return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : this.quote(key);
    }

    static quote(text) {
        return `'${String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }
}

module.exports = ListConfigBuilder;
