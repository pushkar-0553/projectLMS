const Academic = require('../models/academicModel');
const { logActivity } = require('../utils/auditLogger');

const academicController = {
  async createClassLink(req, res) {
    try {
      const { name, url, batch_id, sub_batch_id } = req.body;
      if (!name || !url) {
        return res.status(400).json({ message: 'Link name and URL are required' });
      }

      const linkId = await Academic.createClassLink({
        name,
        url,
        batch_id: batch_id || null,
        sub_batch_id: sub_batch_id || null,
        created_by: req.user.id
      });

      await logActivity(req.user.id, req.user.role, 'CREATE_CLASS_LINK', 'batch', batch_id || sub_batch_id || 'global', `Created class link: ${name}`);
      res.status(201).json({ message: 'Class link saved', linkId });
    } catch (error) {
      console.error('Create class link error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getClassLinks(req, res) {
    try {
      const { batchId, subBatchId } = req.query;
      const links = await Academic.getClassLinks({
        batch_id: batchId,
        sub_batch_id: subBatchId
      });
      res.json(links);
    } catch (error) {
      console.error('Get class links error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async updateClassLink(req, res) {
    try {
      const { linkId } = req.params;
      const { name, url } = req.body;
      if (!name || !url) {
        return res.status(400).json({ message: 'Link name and URL are required' });
      }

      const updated = await Academic.updateClassLink(linkId, { name, url });
      if (!updated) {
        return res.status(404).json({ message: 'Class link not found' });
      }

      await logActivity(req.user.id, req.user.role, 'UPDATE_CLASS_LINK', 'batch', Number(linkId), `Updated class link: ${name}`);
      res.json({ message: 'Class link updated' });
    } catch (error) {
      console.error('Update class link error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async deleteClassLink(req, res) {
    try {
      const { linkId } = req.params;
      const deleted = await Academic.deleteClassLink(linkId);
      if (!deleted) {
        return res.status(404).json({ message: 'Class link not found' });
      }

      await logActivity(req.user.id, req.user.role, 'DELETE_CLASS_LINK', 'batch', Number(linkId), 'Deleted class link');
      res.json({ message: 'Class link deleted' });
    } catch (error) {
      console.error('Delete class link error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getOverview(req, res) {
    try {
      const overview = await Academic.getOverview();
      res.json(overview);
    } catch (error) {
      console.error('Get academic overview error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async createAttendanceSession(req, res) {
    try {
      const { title, session_date, batch_id, sub_batch_id, notes } = req.body;
      if (!title || !session_date) {
        return res.status(400).json({ message: 'Title and session date are required' });
      }

      const sessionId = await Academic.createAttendanceSession({
        title,
        session_date,
        batch_id,
        sub_batch_id,
        notes,
        created_by: req.user.id
      });

      await logActivity(req.user.id, req.user.role, 'CREATE_ATTENDANCE', 'batch', batch_id || sub_batch_id || sessionId, `Created attendance session: ${title}`);
      res.status(201).json({ message: 'Attendance session created', sessionId });
    } catch (error) {
      console.error('Create attendance session error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async markAttendance(req, res) {
    try {
      const { sessionId } = req.params;
      const { records } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ message: 'Records must be an array' });
      }

      await Academic.markAttendance(sessionId, records);
      await logActivity(req.user.id, req.user.role, 'MARK_ATTENDANCE', 'batch', Number(sessionId), `Marked attendance for ${records.length} students`);
      res.json({ message: 'Attendance saved' });
    } catch (error) {
      console.error('Mark attendance error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getAttendanceSessions(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const sessions = await Academic.getAttendanceSessions(
        req.user.role === 'coordinator' ? req.user.id : null,
        startDate || null,
        endDate || null
      );
      res.json(sessions);
    } catch (error) {
      console.error('Get attendance sessions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getAttendanceRecords(req, res) {
    try {
      const { sessionId } = req.params;
      const records = await Academic.getAttendanceRecords(sessionId);
      res.json(records);
    } catch (error) {
      console.error('Get attendance records error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async createAssessment(req, res) {
    try {
      const { title, assessment_type, assessment_date, max_marks, syllabus } = req.body;
      if (!title || !assessment_date) {
        return res.status(400).json({ message: 'Title and assessment date are required' });
      }

      const assessmentId = await Academic.createAssessment({
        title,
        assessment_type,
        assessment_date,
        max_marks,
        syllabus,
        created_by: req.user.id
      });

      await logActivity(req.user.id, req.user.role, 'CREATE_ASSESSMENT', 'task', assessmentId, `Created ${assessment_type || 'weekly'} assessment: ${title}`);
      res.status(201).json({ message: 'Assessment created', assessmentId });
    } catch (error) {
      console.error('Create assessment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async recordAssessmentResults(req, res) {
    try {
      const { assessmentId } = req.params;
      const { results } = req.body;
      if (!Array.isArray(results)) {
        return res.status(400).json({ message: 'Results must be an array' });
      }

      await Academic.recordAssessmentResults(assessmentId, results);
      await logActivity(req.user.id, req.user.role, 'RECORD_ASSESSMENT_RESULTS', 'task', Number(assessmentId), `Recorded results for ${results.length} students`);
      res.json({ message: 'Assessment results saved' });
    } catch (error) {
      console.error('Record assessment results error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getAssessments(req, res) {
    try {
      const assessments = await Academic.getAssessments(req.user.role === 'coordinator' ? req.user.id : null);
      res.json(assessments);
    } catch (error) {
      console.error('Get assessments error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getMyAcademics(req, res) {
    try {
      const [attendance, assessments] = await Promise.all([
        Academic.getStudentAttendance(req.user.id),
        Academic.getStudentAssessmentResults(req.user.id)
      ]);
      res.json({ attendance, assessments });
    } catch (error) {
      console.error('Get my academics error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = academicController;
