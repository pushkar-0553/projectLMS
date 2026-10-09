const reportService = require('../../services/reportService');

async function getExamAssignmentReport(req, res) {
  try {
    const report = await reportService.getExamAssignmentReport(req.params.assignmentId);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function downloadExamCSV(req, res) {
  try {
    const report = await reportService.getExamAssignmentReport(req.params.assignmentId);
    const csvData = reportService.convertCandidatesToCSV(report.candidates);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exam_report_${req.params.assignmentId}.csv"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).send(err.message);
  }
}

async function getSecurityViolationReport(req, res) {
  try {
    const { assignmentId } = req.query;
    const report = await reportService.getSecurityViolationReport(assignmentId);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getExamAssignmentReport,
  downloadExamCSV,
  getSecurityViolationReport
};
