const db = require('../config/database');

const LOCK_TTL_SECONDS = 45;

class ProjectLock {
  static async getLock(projectId) {
    const [rows] = await db.query('SELECT * FROM project_locks WHERE project_id = ?', [projectId]);
    if (rows.length === 0) {
      return null;
    }
    return rows[0];
  }

  static isStale(lockRow) {
    if (!lockRow || !lockRow.heartbeat_at) {
      return true;
    }
    return Date.now() - new Date(lockRow.heartbeat_at).getTime() > LOCK_TTL_SECONDS * 1000;
  }

  static async acquire({ projectId, userId, username, force = false }) {
    const existing = await this.getLock(projectId);

    if (existing && !this.isStale(existing) && existing.locked_by_user_id !== userId && !force) {
      return {
        acquired: false,
        conflict: {
          userId: existing.locked_by_user_id,
          username: existing.locked_by_username,
          lockedAt: existing.locked_at,
          heartbeatAt: existing.heartbeat_at
        }
      };
    }

    await db.query(
      `INSERT INTO project_locks (project_id, locked_by_user_id, locked_by_username, heartbeat_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         locked_by_user_id = VALUES(locked_by_user_id),
         locked_by_username = VALUES(locked_by_username),
         locked_at = CURRENT_TIMESTAMP,
         heartbeat_at = NOW()`,
      [projectId, userId, username]
    );

    return { acquired: true };
  }

  static async heartbeat(projectId, userId) {
    const [result] = await db.query(
      `UPDATE project_locks
       SET heartbeat_at = NOW()
       WHERE project_id = ? AND locked_by_user_id = ?`,
      [projectId, userId]
    );
    return result.affectedRows > 0;
  }

  static async release(projectId, userId) {
    await db.query('DELETE FROM project_locks WHERE project_id = ? AND locked_by_user_id = ?', [projectId, userId]);
  }

  static async requireLockOwner(projectId, userId) {
    const lock = await this.getLock(projectId);
    if (!lock) {
      return { ok: true, reason: null };
    }

    if (this.isStale(lock)) {
      await db.query('DELETE FROM project_locks WHERE project_id = ?', [projectId]);
      return { ok: true, reason: null };
    }

    if (lock.locked_by_user_id !== userId) {
      return {
        ok: false,
        reason: {
          userId: lock.locked_by_user_id,
          username: lock.locked_by_username,
          heartbeatAt: lock.heartbeat_at
        }
      };
    }

    return { ok: true, reason: null };
  }
}

ProjectLock.LOCK_TTL_SECONDS = LOCK_TTL_SECONDS;

module.exports = ProjectLock;