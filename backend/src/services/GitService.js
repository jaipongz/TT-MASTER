const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitService {
    static pushTempToRepo(repoUrl, projectName) {
        if (!repoUrl) {
            throw new Error('Repo URL is missing');
        }

        const BRANCH = 'jaipongz'; // ✅ ตั้งชื่อ branch ตรงนี้
        const tempDir = path.join(__dirname, '../../temp');
        const repoDir = path.join(tempDir, '_repo');

        console.log('🚀 Pushing temp files to git...');
        console.log('📦 Repo:', repoUrl);
        console.log('🌿 Branch:', BRANCH);

        // 1. clean repo dir
        if (fs.existsSync(repoDir)) {
            fs.rmSync(repoDir, { recursive: true, force: true });
        }

        // 2. clone repo
        execSync(`git clone ${repoUrl} ${repoDir}`, { stdio: 'inherit' });

        // 3. checkout branch (create if not exists)
        try {
            execSync(`git checkout ${BRANCH}`, { cwd: repoDir, stdio: 'inherit' });
        } catch {
            console.log(`🌱 Creating branch ${BRANCH}`);
            execSync(`git checkout -b ${BRANCH}`, {
                cwd: repoDir,
                stdio: 'inherit'
            });
        }

        // 4. copy temp files (exclude _repo itself)
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
            if (file === '_repo') continue;

            const src = path.join(tempDir, file);
            const dest = path.join(repoDir, file);

            fs.cpSync(src, dest, { recursive: true });
        }

        // 5. git add
        execSync(`git add .`, { cwd: repoDir });

        // ✅ เช็กว่ามีอะไรให้ commit ไหม
        const status = execSync(`git status --porcelain`, {
            cwd: repoDir,
            encoding: 'utf8'
        });

        if (!status.trim()) {
            console.log('ℹ️ No changes to commit, skipping git commit');
        } else {
            execSync(
                `git commit -m "auto: push jaipongz industries"`,
                { cwd: repoDir, stdio: 'inherit' }
            );

            execSync(`git push origin ${BRANCH}`, {
                cwd: repoDir,
                stdio: 'inherit'
            });
        }
        return {
            success: true,
            repo: repoUrl,
            branch: BRANCH
        };
    }
}

module.exports = GitService;
