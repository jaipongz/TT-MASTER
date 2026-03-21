const fs = require('fs');
const path = require('path');

class AppModuleUpdater {
    // Keep API module registration synchronized in api/src/app.module.ts.
    static registerModule({ workspaceDir, context }) {
        const appModulePath = path.join(workspaceDir, 'api/src/app.module.ts');
        if (!fs.existsSync(appModulePath)) return false;

        let source = fs.readFileSync(appModulePath, 'utf8');
        const importLine = `import { ${context.ModuleName} } from './modules/${context.fileName}/${context.fileName}.module';`;

        if (!source.includes(importLine)) {
            const marker = "import { AppController } from './app.controller';";
            if (source.includes(marker)) {
                source = source.replace(marker, `${importLine}\n${marker}`);
            } else {
                source = `${importLine}\n${source}`;
            }
        }

        const importsMatch = source.match(/imports:\s*\[([\s\S]*?)\],\s*controllers:/);
        if (!importsMatch) {
            fs.writeFileSync(appModulePath, source, 'utf8');
            return true;
        }

        const moduleRef = `${context.ModuleName},`;
        if (!importsMatch[1].includes(context.ModuleName)) {
            const updatedImports = `${importsMatch[1]}    ${moduleRef}\n  `;
            source = source.replace(importsMatch[0], `imports: [${updatedImports}],\n  controllers:`);
        }

        fs.writeFileSync(appModulePath, source, 'utf8');
        return true;
    }
}

module.exports = AppModuleUpdater;
