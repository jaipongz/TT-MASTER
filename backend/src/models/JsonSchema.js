const db = require('../config/database');

class JsonSchema {
    static async getByProjectId(projectId) {
        try {
            console.log('🔍 getByProjectId for:', projectId);
            const [rows] = await db.query(
                `SELECT
                    js.id,
                    js.project_id,
                    js.json_data,
                    js.created_at,
                    js.updated_at,
                    p.last_updated_by_user_id,
                    u.display_name AS last_updated_by_display_name,
                    u.email AS last_updated_by_email
                 FROM json_schemas js
                 LEFT JOIN projects p ON p.id = js.project_id
                 LEFT JOIN users u ON u.id = p.last_updated_by_user_id
                 WHERE js.project_id = ?`,
                [projectId]
            );
            console.log('📊 Found rows:', rows.length);
            return rows[0] || null;
        } catch (error) {
            console.error('❌ getByProjectId ERROR:', error.message);
            throw error; // สำคัญ: ต้อง throw
        }
    }

    static async save(projectId, jsonData) {
        try {
            console.log('💾 SAVE called!');
            console.log('📦 projectId:', projectId);
            console.log('📦 jsonData type:', typeof jsonData);
            console.log('📦 jsonData preview:', typeof jsonData === 'string' 
                ? jsonData.substring(0, 100) 
                : JSON.stringify(jsonData).substring(0, 100));
            
            // ตรวจสอบว่ามี projectId จริงไหม
            if (!projectId) {
                throw new Error('projectId is required');
            }
            
            // แปลงเป็น string ถ้ายังไม่ใช่
            const jsonString = typeof jsonData === 'string' 
                ? jsonData 
                : JSON.stringify(jsonData, null, 2);
            
            const existing = await this.getByProjectId(projectId);
            console.log('🔍 Existing record:', existing ? 'YES' : 'NO');
            
            let result;
            if (existing) {
                console.log('🔄 Updating existing record...');
                [result] = await db.query(
                    'UPDATE json_schemas SET json_data = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?',
                    [jsonString, projectId]
                );
                console.log('✅ Update affected rows:', result.affectedRows);
            } else {
                console.log('🆕 Inserting new record...');
                [result] = await db.query(
                    'INSERT INTO json_schemas (project_id, json_data) VALUES (?, ?)',
                    [projectId, jsonString]
                );
                console.log('✅ Insert ID:', result.insertId);
            }
            
            console.log('🎉 SAVE completed successfully!');
            return { success: true, message: 'Saved successfully' };
            
        } catch (error) {
            console.error('💥 SAVE ERROR:', error.message);
            console.error('💥 Error stack:', error.stack);
            throw error; // สำคัญ: ต้อง throw ให้ controller จับ
        }
    }

    static async validateJson(jsonData) {
        try {
            console.log('✅ Validating JSON...');
            JSON.parse(jsonData);
            return { valid: true, error: null };
        } catch (error) {
            console.error('❌ JSON validation error:', error.message);
            return { valid: false, error: error.message };
        }
    }
}

module.exports = JsonSchema;