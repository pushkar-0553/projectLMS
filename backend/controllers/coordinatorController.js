const pool = require('../config/db');
const StudentProgress = require('../models/studentProgressModel');

const coordinatorController = {
  // Get all students with their progress
  async getStudents(req, res) {
    try {
      const [rows] = await pool.execute(`
        SELECT DISTINCT u.id, u.name, u.email, u.mobile, u.batch,
               COUNT(sp.id) as total_submissions,
               COUNT(CASE WHEN sp.status = 'pending' THEN 1 END) as pending_submissions,
               COUNT(CASE WHEN sp.status = 'approved' THEN 1 END) as approved_submissions,
               MAX(sp.submitted_at) as last_activity
        FROM Users u
        LEFT JOIN StudentProgress sp ON u.id = sp.user_id
        WHERE u.role = 'student'
        GROUP BY u.id, u.name, u.email, u.mobile, u.batch
        ORDER BY u.name
      `);
      
      res.json(rows);
    } catch (error) {
      console.error('Get students error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get pending approvals for coordinator
  async getPendingApprovals(req, res) {
    try {
      const pendingApprovals = await StudentProgress.getPendingApprovals();
      res.json(pendingApprovals);
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get specific student's progress
  async getStudentProgress(req, res) {
    try {
      const { studentId } = req.params;
      const { projectId } = req.query;
      
      const progress = await StudentProgress.getUserProgress(studentId, projectId);
      res.json(progress);
    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Approve a step submission
  async approveStep(req, res) {
    try {
      const { progressId } = req.params;
      const { feedback } = req.body;
      const reviewerId = req.user.id;

      const success = await StudentProgress.updateStatus(
        progressId, 
        'approved', 
        reviewerId, 
        feedback
      );

      if (!success) {
        return res.status(404).json({ message: 'Progress record not found' });
      }

      res.json({ message: 'Step approved successfully' });
    } catch (error) {
      console.error('Approve step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Reject a step submission
  async rejectStep(req, res) {
    try {
      const { progressId } = req.params;
      const { feedback } = req.body;
      const reviewerId = req.user.id;

      if (!feedback) {
        return res.status(400).json({ message: 'Feedback is required for rejection' });
      }

      const success = await StudentProgress.updateStatus(
        progressId, 
        'rejected', 
        reviewerId, 
        feedback
      );

      if (!success) {
        return res.status(404).json({ message: 'Progress record not found' });
      }

      res.json({ message: 'Step rejected successfully' });
    } catch (error) {
      console.error('Reject step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get coordinator dashboard stats
  async getDashboardStats(req, res) {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          COUNT(DISTINCT u.id) as total_students,
          COUNT(CASE WHEN sp.status = 'pending' THEN 1 END) as pending_approvals,
          COUNT(CASE WHEN sp.status = 'approved' THEN 1 END) as total_approvals,
          COUNT(CASE WHEN sp.status = 'rejected' THEN 1 END) as total_rejections,
          COUNT(DISTINCT sp.project_id) as active_projects
        FROM Users u
        LEFT JOIN StudentProgress sp ON u.id = sp.user_id
        WHERE u.role = 'student'
      `);
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get project progress statistics for graphs
  async getProjectStats(req, res) {
    try {
      const [rows] = await pool.execute(`
        SELECT p.title as name, COUNT(DISTINCT sp.user_id) as students
        FROM Projects p
        JOIN StudentProgress sp ON p.id = sp.project_id
        GROUP BY p.id, p.title
      `);
      
      res.json(rows);
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = coordinatorController;
