// JSON Editor Module
class JsonEditor {
    constructor() {
        this.jsonData = {};
        this.currentView = 'tree';
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.setupCodeEditor();
    }
    
    setupEventListeners() {
        // Validate JSON button
        document.getElementById('validate-json').addEventListener('click', () => {
            this.validateJson();
        });
        
        // Save JSON button
        document.getElementById('save-json').addEventListener('click', () => {
            this.saveJson();
        });
        
        // Auto-format JSON on blur in code editor
        document.getElementById('json-code-editor').addEventListener('blur', () => {
            this.formatJsonCode();
        });
    }
    
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const editorViews = document.querySelectorAll('.editor-view');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                
                // Update active tab
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active view
                editorViews.forEach(view => view.classList.remove('active'));
                document.getElementById(`${mode}-view`).classList.add('active');
                
                this.currentView = mode;
                
                // Sync data between views if needed
                if (mode === 'tree') {
                    this.updateTreeView();
                }
            });
        });
    }
    
    setupCodeEditor() {
        // Basic syntax highlighting (can be enhanced with a proper library)
        const textarea = document.getElementById('json-code-editor');
        
        textarea.addEventListener('input', () => {
            this.jsonData = this.parseJson(textarea.value);
        });
    }
    
    initJsonEditor(jsonString) {
        try {
            const json = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
            this.jsonData = json;
            
            // Update both views
            this.updateTreeView();
            this.updateCodeView();
        } catch (error) {
            console.error('Invalid JSON:', error);
            this.jsonData = {};
            this.updateCodeView('{}');
        }
    }
    
    updateTreeView() {
        const treeContainer = document.getElementById('json-tree');
        treeContainer.innerHTML = this.createTreeHtml(this.jsonData);
        
        // Add toggle functionality
        treeContainer.querySelectorAll('.json-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.json-item');
                item.classList.toggle('collapsed');
                item.classList.toggle('expanded');
                
                const icon = e.target.querySelector('i') || e.target;
                if (item.classList.contains('collapsed')) {
                    icon.className = 'fas fa-plus';
                } else {
                    icon.className = 'fas fa-minus';
                }
            });
        });
    }
    
    updateCodeView(jsonString) {
        const textarea = document.getElementById('json-code-editor');
        const jsonStr = jsonString || JSON.stringify(this.jsonData, null, 2);
        textarea.value = jsonStr;
    }
    
    createTreeHtml(data, depth = 0) {
        if (data === null || data === undefined) {
            return '<span class="json-null">null</span>';
        }
        
        if (typeof data === 'boolean') {
            return `<span class="json-boolean">${data}</span>`;
        }
        
        if (typeof data === 'number') {
            return `<span class="json-number">${data}</span>`;
        }
        
        if (typeof data === 'string') {
            return `<span class="json-string">"${this.escapeHtml(data)}"</span>`;
        }
        
        if (Array.isArray(data)) {
            if (data.length === 0) {
                return '<span class="json-array">[]</span>';
            }
            
            let html = '<div class="json-item expanded">';
            html += `<span class="json-toggle"><i class="fas fa-minus"></i></span>`;
            html += '<span class="json-array">[</span>';
            html += '<div class="json-children">';
            
            data.forEach((item, index) => {
                html += '<div class="json-item">';
                html += `<span class="json-key">${index}</span>: `;
                html += this.createTreeHtml(item, depth + 1);
                html += '</div>';
            });
            
            html += '</div>';
            html += '<span class="json-array">]</span>';
            html += '</div>';
            
            return html;
        }
        
        if (typeof data === 'object') {
            const keys = Object.keys(data);
            
            if (keys.length === 0) {
                return '<span class="json-object">{}</span>';
            }
            
            let html = '<div class="json-item expanded">';
            html += `<span class="json-toggle"><i class="fas fa-minus"></i></span>`;
            html += '<span class="json-object">{</span>';
            html += '<div class="json-children">';
            
            keys.forEach(key => {
                html += '<div class="json-item">';
                html += `<span class="json-key">"${this.escapeHtml(key)}"</span>: `;
                html += this.createTreeHtml(data[key], depth + 1);
                html += '</div>';
            });
            
            html += '</div>';
            html += '<span class="json-object">}</span>';
            html += '</div>';
            
            return html;
        }
        
        return `<span>${data}</span>`;
    }
    
    parseJson(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            return {};
        }
    }
    
    formatJsonCode() {
        const textarea = document.getElementById('json-code-editor');
        try {
            const parsed = JSON.parse(textarea.value);
            textarea.value = JSON.stringify(parsed, null, 2);
            this.jsonData = parsed;
            this.showValidationResult(true, 'JSON is valid and formatted');
        } catch (error) {
            this.showValidationResult(false, error.message);
        }
    }
    
    validateJson() {
        const textarea = document.getElementById('json-code-editor');
        const jsonString = textarea.value;
        
        try {
            JSON.parse(jsonString);
            this.jsonData = JSON.parse(jsonString);
            this.showValidationResult(true, 'JSON is valid');
            
            // Update tree view if in tree mode
            if (this.currentView === 'tree') {
                this.updateTreeView();
            }
        } catch (error) {
            this.showValidationResult(false, error.message);
        }
    }
    
    async saveJson() {
        if (!currentProjectId) {
            showError('No project selected');
            return;
        }
        
        const textarea = document.getElementById('json-code-editor');
        const jsonString = textarea.value;
        
        // Validate before saving
        try {
            JSON.parse(jsonString);
        } catch (error) {
            this.showValidationResult(false, 'Cannot save invalid JSON: ' + error.message);
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/json/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProjectId,
                    jsonData: jsonString
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showValidationResult(true, 'JSON saved successfully');
            } else {
                showError('Failed to save JSON: ' + result.error);
            }
        } catch (error) {
            showError('Network error: ' + error.message);
        }
    }
    
    showValidationResult(isValid, message) {
        const resultDiv = document.getElementById('validation-result');
        
        if (isValid) {
            resultDiv.innerHTML = `
                <div class="valid-json">
                    <i class="fas fa-check-circle"></i> ${message}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="invalid-json">
                    <i class="fas fa-exclamation-circle"></i> ${message}
                </div>
            `;
        }
        
        // Clear result after 5 seconds
        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize JSON Editor when page loads
let jsonEditor;

document.addEventListener('DOMContentLoaded', () => {
    jsonEditor = new JsonEditor();
});

// Export function for app.js to call
function initJsonEditor(jsonData) {
    jsonEditor.initJsonEditor(jsonData);
}