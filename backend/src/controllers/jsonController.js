const JsonSchema = require('../models/JsonSchema');
const MigrationGenerator = require('../utils/MigrationGenerator');
const GitService = require('../services/GitService');
const CodeGenerator = require('../utils/CodeGenerator');
const ProjectScaffolder = require('../utils/ProjectScaffolder');

exports.saveJsonSchema = async (req, res) => {
    console.log('🔥 saveJsonSchema controller called!');
    // console.log('🔥 Request body:', JSON.stringify(req.body, null, 2));

    try {
        const { projectId, jsonData } = req.body;

        // ตรวจสอบข้อมูลที่เข้ามา
        if (!projectId) {
            console.error('❌ Missing projectId');
            return res.status(400).json({
                success: false,
                error: 'projectId is required'
            });
        }

        if (!jsonData) {
            console.error('❌ Missing jsonData');
            return res.status(400).json({
                success: false,
                error: 'jsonData is required'
            });
        }

        // Validate JSON
        console.log('🔍 Validating JSON...');
        const validation = await JsonSchema.validateJson(jsonData);
        console.log('🔍 Validation result:', validation);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid JSON: ' + validation.error
            });
        }

        let schema = jsonData;

        if (typeof schema === 'string') {
            try {
                schema = JSON.parse(schema);
            } catch (err) {
                return res.status(400).json({
                    success: false,
                    error: 'jsonData must be valid JSON'
                });
            }
        }

        console.log('✔ schema type:', typeof schema);
        console.log('✔ module is array:', Array.isArray(schema.module));

        if (!Array.isArray(schema.module)) {
            return res.status(400).json({
                success: false,
                error: 'schema.module must be an array'
            });
        }
        await ProjectScaffolder.scaffold();

        const migrationResult =
            await MigrationGenerator.generateMigration(schema);
        console.log('✔ Migration generation result:', migrationResult);
        
        
        const codeResult =
            await CodeGenerator.generate(schema);
        console.log('✔ Code generation result:', codeResult);
        
        // ===== PUSH TO GIT =====
        const repoUrl =
            schema.setting?.repo || schema.repo;

        if (repoUrl) {
            console.log('🚀 Pushing generated files to git...');
            await GitService.pushTempToRepo(repoUrl, schema.project);
        } else {
            console.log('⚠️ No repo specified, skip git push');
        }

        // Save to database
        console.log('🚀 Calling JsonSchema.save()...');
        const saveResult = await JsonSchema.save(projectId, jsonData);
        console.log('🚀 Save result:', saveResult);

        res.json({
            success: true,
            message: 'JSON saved successfully',
            data: saveResult
        });

    } catch (error) {
        console.error('💥 CONTROLLER ERROR:', error);
        console.error('💥 Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
};

exports.getJsonSchema = async (req, res) => {
    try {
        console.log('📥 GET JSON for projectId:', req.params.projectId);
        const schema = await JsonSchema.getByProjectId(req.params.projectId);

        if (!schema) {
            return res.json({
                success: true,
                data: null,
                message: 'No JSON data found for this project'
            });
        }

        // Parse JSON data ถ้าจำเป็น
        try {
            if (schema.json_data && typeof schema.json_data === 'string') {
                schema.json_data = JSON.parse(schema.json_data);
            }
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message);
        }

        res.json({
            success: true,
            data: schema
        });

    } catch (error) {
        console.error('Get JSON error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch JSON data'
        });
    }
};