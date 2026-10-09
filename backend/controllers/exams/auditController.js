const auditService = require('../../services/auditService');

async function getAuditLogs(req, res) {
  try {
    const { limit, offset, action, entityType } = req.query;
    const logs = await auditService.getAuditLogs({ limit, offset, action, entityType });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAuditLogs
};
