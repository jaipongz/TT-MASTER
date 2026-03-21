class FormConfigBuilder {
    // Build UI form config from dynamic module schema (fields + form layout + childs).
    static build(moduleConfig = {}) {
        const fields = moduleConfig.fields || {};
        const childs = moduleConfig.childs || {};
        const fileName = String(moduleConfig.tblname || '').trim();

        const formConfig = {
            width: 100,
            master_field: moduleConfig?.form?.masterfield || 'title',
            box: []
        };

        const rows = Array.isArray(moduleConfig?.form?.rows) ? moduleConfig.form.rows : [];
        for (const row of rows) {
            const boxes = Array.isArray(row?.box) ? row.box : [];
            for (const box of boxes) {
                const built = this.buildBoxFromLayout(box, fields, childs, fileName);
                if (built) {
                    formConfig.box.push(built);
                }
            }
        }

        if (formConfig.box.length === 0) {
            formConfig.box.push(this.buildFallbackBox(fields, fileName, moduleConfig.title));
        }

        return this.toTsLiteral(formConfig);
    }

    static buildBoxFromLayout(box, fields, childs, fileName) {
        const boxFields = Array.isArray(box?.fields) ? box.fields : [];
        const boxWidth = this.toNumber(box?.width, 100);
        if (boxFields.length === 0) return null;

        if (boxFields.length === 1) {
            const name = String(boxFields[0]?.field || '').trim();
            const childDef = childs[name];
            if (childDef?.type === 'gallery') {
                return this.buildGalleryBlock(name, childDef, boxWidth);
            }
            if (childDef?.type === 'child') {
                return this.buildChildBlock(name, childDef, boxWidth, this.toNumber(boxFields[0]?.width, 100), fileName);
            }
        }

        const builtFields = [];
        for (const layoutField of boxFields) {
            const name = String(layoutField?.field || '').trim();
            if (!name) continue;

            if (fields[name]) {
                builtFields.push(this.buildField(name, fields[name], this.toNumber(layoutField?.width, 100), fileName));
                continue;
            }

            const childDef = childs[name];
            if (!childDef) continue;

            if (childDef.type === 'child') {
                builtFields.push({
                    width: this.toNumber(layoutField?.width, 100),
                    type: 'child',
                    childConfig: this.buildChildConfig(name, childDef, fileName)
                });
                continue;
            }

            if (childDef.type === 'gallery') {
                return this.buildGalleryBlock(name, childDef, boxWidth);
            }
        }

        if (builtFields.length === 0) return null;

        return {
            label: box?.label || 'Section',
            width: boxWidth,
            fields: builtFields
        };
    }

    static buildFallbackBox(fields, fileName, moduleTitle) {
        const builtFields = Object.entries(fields).map(([name, cfg]) => this.buildField(name, cfg || {}, 100, fileName));
        return {
            label: moduleTitle || 'Form',
            width: 100,
            fields: builtFields
        };
    }

    static buildField(name, fieldConfig, width, fileName) {
        const type = String(fieldConfig?.type || 'text').toLowerCase();
        const out = {
            field: name,
            name: fieldConfig?.label || name,
            width,
            type
        };

        out.required = String(fieldConfig?.required || 'F') === 'T';

        if (fieldConfig?.support) {
            out.support = fieldConfig.support;
        }

        if (type === 'switch' && Array.isArray(fieldConfig?.lookup) && fieldConfig.lookup.length > 0) {
            out.options = fieldConfig.lookup.map((item) => ({
                label: String(item?.label || ''),
                value: this.normalizeSwitchValue(item?.value)
            }));
        }

        if (this.supportLookup(type) && Array.isArray(fieldConfig?.lookup) && fieldConfig.lookup.length > 0) {
            out.lookup = {
                endpoint: `/${fileName}/lookup`,
                field: this.lookupFieldKey(name, fieldConfig.lookup)
            };
        }

        if (String(fieldConfig?.search || 'F') === 'T') {
            out.search = true;
        }

        const modeObj = this.normalizeMode(fieldConfig?.mode);
        if (modeObj) {
            out.mode = modeObj;
        }

        return out;
    }

    static buildChildBlock(name, childDef, boxWidth, fieldWidth, fileName) {
        return {
            label: childDef?.title || name,
            width: boxWidth,
            fields: [
                {
                    width: fieldWidth,
                    type: 'child',
                    childConfig: this.buildChildConfig(name, childDef, fileName)
                }
            ]
        };
    }

    static buildChildConfig(name, childDef, fileName) {
        const childFields = childDef?.fields || {};
        const columns = this.buildChildColumns(childDef?.list?.data?.column);
        const childLayoutFields = this.extractChildLayoutFields(childDef?.list?.form?.rows);
        const fields = childLayoutFields.length > 0
            ? childLayoutFields
                .filter((item) => childFields[item.field])
                .map((item) => this.buildField(item.field, childFields[item.field] || {}, this.toNumber(item.width, 100), fileName))
            : Object.entries(childFields).map(([fieldName, cfg]) => this.buildField(fieldName, cfg || {}, 100, fileName));

        return {
            title: childDef?.title || name,
            columns,
            fields
        };
    }

    static extractChildLayoutFields(rows) {
        const result = [];
        const rowList = Array.isArray(rows) ? rows : [];
        for (const row of rowList) {
            const boxes = Array.isArray(row?.box) ? row.box : [];
            for (const box of boxes) {
                const fields = Array.isArray(box?.fields) ? box.fields : [];
                for (const field of fields) {
                    const name = String(field?.field || '').trim();
                    if (!name) continue;
                    result.push({ field: name, width: field?.width });
                }
            }
        }
        return result;
    }

    static buildChildColumns(columnsConfig) {
        const columns = Array.isArray(columnsConfig) ? columnsConfig : [];
        if (columns.length === 0) {
            return [];
        }

        const weights = columns.map((col) => this.toNumber(col?.width, 1));
        const total = weights.reduce((sum, item) => sum + item, 0) || 1;

        return columns.map((col, index) => {
            const pct = Math.max(1, Math.round((weights[index] / total) * 100));
            return {
                key: String(col?.field || ''),
                label: String(col?.label || col?.field || ''),
                width: `${pct}%`
            };
        });
    }

    static buildGalleryBlock(name, childDef, width) {
        const mode = {
            mode: String(childDef?.mode || 'mixed'),
            type: 'scaledown'
        };

        return {
            label: childDef?.title || name,
            field: `__gallery_${name}`,
            width,
            type: 'gallery',
            maxSize: this.parseMaxSize(childDef?.max_size),
            support: String(childDef?.support || ''),
            mode
        };
    }

    static supportLookup(type) {
        return type === 'dropdown' || type === 'radio' || type === 'checkbox' || type === 'tag';
    }

    static lookupFieldKey(fieldName, lookupArr) {
        const first = lookupArr[0] || {};
        const tableName = String(first?.tbl_name || '').trim();
        return tableName || fieldName;
    }

    static normalizeMode(mode) {
        if (!mode || typeof mode !== 'object' || Array.isArray(mode)) return null;
        const out = {};
        for (const [k, v] of Object.entries(mode)) {
            if (v === null || v === undefined || v === '') continue;
            if (typeof v === 'string' && /^\d+$/.test(v)) {
                out[k] = Number(v);
            } else {
                out[k] = v;
            }
        }
        return Object.keys(out).length > 0 ? out : null;
    }

    static normalizeSwitchValue(value) {
        const raw = String(value ?? '').trim();
        if (raw === '1' || raw.toLowerCase() === 'true') return 'true';
        if (raw === '0' || raw.toLowerCase() === 'false') return 'false';
        return raw;
    }

    static parseMaxSize(value) {
        const raw = String(value || '').toLowerCase();
        const matched = raw.match(/\d+/);
        return matched ? Number(matched[0]) : 50;
    }

    static toNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    // Render object as TS literal and keep field items compact for readability.
    static toTsLiteral(value, indentLevel = 0, parentKey = '') {
        const indent = '  '.repeat(indentLevel);
        const nextIndent = '  '.repeat(indentLevel + 1);

        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';

            const lines = value.map((item) => {
                if (parentKey === 'fields' && this.canInlineFieldItem(item)) {
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

    static canInlineFieldItem(item) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
        return Object.values(item).every((val) => {
            if (val === null) return true;
            const type = typeof val;
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

module.exports = FormConfigBuilder;
