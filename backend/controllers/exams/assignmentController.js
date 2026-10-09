const assignmentService = require('../../services/assignmentService');

async function listAssignments(req, res) {
  try {
    const { status, courseId } = req.query;
    const courseSlug = req.query.courseSlug || req.headers['x-course-slug'];
    const assignments = await assignmentService.listAssignments({ status, courseId, courseSlug });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function createAssignment(req, res) {
  try {
    const result = await assignmentService.createAssignment(req.body, req.user.id);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

async function getAssignmentById(req, res) {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function updateAssignmentStatus(req, res) {
  try {
    const { status } = req.body;
    const result = await assignmentService.updateAssignmentStatus(req.params.id, status, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}

module.exports = {
  listAssignments,
  createAssignment,
  getAssignmentById,
  updateAssignmentStatus
};
