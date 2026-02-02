// backend/src/utils/ProjectScaffolder.js
const fs = require('fs');
const path = require('path');

class ProjectScaffolder {
    static scaffold() {
        const templateDir = path.join(__dirname, '../../templates/project');
        const tempDir = path.join(__dirname, '../../temp');

        // copy template -> temp
        fs.cpSync(templateDir, tempDir, { recursive: true });
    }
}

module.exports = ProjectScaffolder; // ✅ สำคัญมาก
