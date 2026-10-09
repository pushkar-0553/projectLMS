const stageDbService = require('../../services/stageDbService');

async function listBatches(req, res) {
  try {
    const courseId = req.query.courseId;
    const courseSlug = req.query.courseSlug || req.headers['x-course-slug'];
    const batches = await stageDbService.getBatches({ courseId, courseSlug });
    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function listStudentsByBatch(req, res) {
  try {
    const students = await stageDbService.getStudentsByBatch(req.params.batchId);
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

async function listCourses(req, res) {
  try {
    const courses = await stageDbService.getCourses();
    res.json({ success: true, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  listBatches,
  listStudentsByBatch,
  listCourses
};
