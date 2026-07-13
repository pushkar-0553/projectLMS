const AttendanceModel = require('../models/attendanceModel');

const attendanceController = {

  // GET /api/attendance/batches — coordinator's batches
  async getBatches(req, res) {
    try {
      const userId = req.user.id;
      const role = req.user.role;

      const batches = role === 'admin'
        ? await AttendanceModel.getAllBatches()
        : await AttendanceModel.getBatchesByCoordinator(userId);

      res.json(batches);
    } catch (err) {
      console.error('getBatches error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/attendance/unassigned — students with no batch
  async getUnassigned(req, res) {
    try {
      const students = await AttendanceModel.getUnassignedStudents();
      res.json(students);
    } catch (err) {
      console.error('getUnassigned error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/attendance/assign — assign student to batch
  async assignStudent(req, res) {
    try {
      const { studentId, batchId } = req.body;
      if (!studentId || !batchId) {
        return res.status(400).json({ message: 'studentId and batchId are required' });
      }
      await AttendanceModel.assignStudentToBatch(studentId, batchId, req.user.id);
      res.json({ message: 'Student assigned successfully' });
    } catch (err) {
      console.error('assignStudent error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // DELETE /api/attendance/assign/:studentId/:batchId — remove from batch
  async removeStudent(req, res) {
    try {
      const { studentId, batchId } = req.params;
      await AttendanceModel.removeStudentFromBatch(studentId, batchId);
      res.json({ message: 'Student removed from batch' });
    } catch (err) {
      console.error('removeStudent error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/attendance/today/:batchId — today's attendance
  async getToday(req, res) {
    try {
      const { batchId } = req.params;
      const data = await AttendanceModel.getTodayAttendance(batchId);
      res.json(data);
    } catch (err) {
      console.error('getToday error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/attendance/session/:batchId — create or update today's session (topic/notes)
  async upsertSession(req, res) {
    try {
      const { batchId } = req.params;
      const { topicCovered = '', notes = '' } = req.body;

      const session = await AttendanceModel.getOrCreateTodaySession(
        batchId, req.user.id, topicCovered, notes
      );

      // If session already existed, update the topic/notes
      if (session.topic_covered !== topicCovered || session.notes !== notes) {
        await AttendanceModel.updateSession(session.id, topicCovered, notes);
        session.topic_covered = topicCovered;
        session.notes = notes;
      }

      res.json(session);
    } catch (err) {
      console.error('upsertSession error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/attendance/mark — bulk mark attendance
  // Body: { sessionId, records: [{ studentId, status, remarks }] }
  async markAttendance(req, res) {
    try {
      const { sessionId, records } = req.body;

      if (!sessionId || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: 'sessionId and records array are required' });
      }

      const validStatuses = ['present', 'absent', 'late', 'excused'];
      for (const r of records) {
        if (!r.studentId || !validStatuses.includes(r.status)) {
          return res.status(400).json({
            message: `Invalid record: studentId and status (${validStatuses.join('|')}) required`
          });
        }
      }

      await AttendanceModel.bulkSaveRecords(sessionId, records, req.user.id);
      res.json({ message: 'Attendance saved successfully' });
    } catch (err) {
      console.error('markAttendance error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/attendance/history/:batchId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  async getHistory(req, res) {
    try {
      const { batchId } = req.params;
      const { startDate, endDate } = req.query;

      // Default: last 30 days
      const end = endDate || new Date().toISOString().slice(0, 10);
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);

      const history = await AttendanceModel.getHistory(batchId, start, end);
      res.json(history);
    } catch (err) {
      console.error('getHistory error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/attendance/session/:sessionId — full detail of one session
  async getSessionDetail(req, res) {
    try {
      const { sessionId } = req.params;
      const data = await AttendanceModel.getSessionDetail(sessionId);
      res.json(data);
    } catch (err) {
      console.error('getSessionDetail error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/attendance/my-summary — student's own attendance
  async getMyAttendanceSummary(req, res) {
    try {
      const studentId = req.user.id;
      const { startDate, endDate } = req.query;

      // Find student's batch
      const pool = require('../config/db');
      const [batchRows] = await pool.execute(
        `SELECT batch_id FROM StudentBatchMap WHERE student_id = ? LIMIT 1`,
        [studentId]
      );

      if (batchRows.length === 0) {
        return res.json({ status: 'unassigned', records: [] });
      }

      const batchId = batchRows[0].batch_id;
      const end = endDate || new Date().toISOString().slice(0, 10);
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);

      const records = await AttendanceModel.getStudentSummary(studentId, batchId, start, end);

      const totalDays = records.length;
      const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      res.json({ status: 'assigned', batchId, records, totalDays, presentDays, percentage });
    } catch (err) {
      console.error('getMyAttendanceSummary error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = attendanceController;
