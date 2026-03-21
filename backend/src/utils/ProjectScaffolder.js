// backend/src/utils/ProjectScaffolder.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectScaffolder {
    static async scaffold(options = {}) {
        const templateRepoUrl =
            options.templateRepoUrl ||
            process.env.TEMPLATE_PROJECT_REPO ||
            'https://github.com/jaipongz/NEXT-TEMP26.git';
        const workspaceDir =
            options.workspaceDir ||
            path.join(__dirname, '../../temp/default-project');
        const templateRepoDir = path.join(workspaceDir, '_template_repo');

        if (!templateRepoUrl) {
            throw new Error('Template repository URL is required');
        }

        if (fs.existsSync(workspaceDir)) {
            fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
        fs.mkdirSync(workspaceDir, { recursive: true });

        if (fs.existsSync(templateRepoDir)) {
            fs.rmSync(templateRepoDir, { recursive: true, force: true });
        }

        try {
            execSync(`git clone --depth 1 ${templateRepoUrl} ${templateRepoDir}`, {
                stdio: 'inherit'
            });

            this.copyTemplateToTemp(templateRepoDir, workspaceDir);
        } finally {
            if (fs.existsSync(templateRepoDir)) {
                fs.rmSync(templateRepoDir, { recursive: true, force: true });
            }
        }
    }

    static copyTemplateToTemp(sourceDir, tempDir) {
        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Template source does not exist: ${sourceDir}`);
        }

        fs.mkdirSync(tempDir, { recursive: true });

        const entries = fs.readdirSync(sourceDir);
        for (const entry of entries) {
            if (entry === '.git') continue;

            const srcPath = path.join(sourceDir, entry);
            const destPath = path.join(tempDir, entry);
            fs.cpSync(srcPath, destPath, { recursive: true, force: true });
        }
    }
}

module.exports = ProjectScaffolder; // ✅ สำคัญมาก
