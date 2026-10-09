const db = require('../config/db');

async function logAudit({ actorType = 'SYSTEM', actorId = null, action, entityType, entityId = null, payload = null, ipAddress = null }) {
  try {
    const payloadJson = payload ? JSON.stringify(payload) : null;
    await db.query(`
      INSERT INTO exam_audit_logs 
        (actor_type, actor_id, action, entity_type, entity_id, payload_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [actorType, actorId, action, entityType, entityId, payloadJson, ipAddress]);
  } catch (err) {
    console.error('[AUDIT ERROR] Failed to record audit log:', err.message);
  }
}

async function getAuditLogs({ limit = 100, offset = 0, action = null, entityType = null } = {}) {
  let sql = 'SELECT * FROM exam_audit_logs WHERE 1=1';
  const params = [];

  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }
  if (entityType) {
    sql += ' AND entity_type = ?';
    params.push(entityType);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await db.query(sql, params);
  const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM exam_audit_logs');
  return { logs: rows, total: count };
}

module.exports = {
  logAudit,
  getAuditLogs
};
