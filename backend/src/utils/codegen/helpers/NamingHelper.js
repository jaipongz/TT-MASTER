class NamingHelper {
    // Convert module/field names between snake, camel, pascal and title cases.
    static snake(value) {
        return String(value || '')
            .trim()
            .replace(/-/g, '_')
            .replace(/\s+/g, '_')
            .toLowerCase();
    }

    static kebab(value) {
        return this.snake(value).replace(/_/g, '-');
    }

    static pascal(value) {
        return this.snake(value)
            .split('_')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }

    static camel(value) {
        const p = this.pascal(value);
        return p ? p.charAt(0).toLowerCase() + p.slice(1) : '';
    }

    static title(value) {
        return this.snake(value)
            .split('_')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }
}

module.exports = NamingHelper;
