const Task = require('../models/taskModel');
const pool = require('../config/db');

const studentController = {
  async getMyTasks(req, res) {
    try {
      const studentId = req.user.id;
      const tasks = await Task.getTasksForStudent(studentId);
      res.json(tasks);
    } catch (error) {
      console.error('Get my tasks error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getTaskDetail(req, res) {
    try {
      const { id } = req.params;
      const studentId = req.user.id;

      // Issue #27 fix: Verify ownership/assignment of the task to this student
      const tasks = await Task.getTasksForStudent(studentId);
      const isAssigned = tasks.some(t => t.id == id);
      if (!isAssigned) {
        return res.status(403).json({ message: 'Access denied. This task is not assigned to you.' });
      }

      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Get task detail error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async submitTask(req, res) {
    try {
      const { task_id, submission_text } = req.body;
      const studentId = req.user.id;

      // Issue #26 fix: Accept uploaded file path from req.file or fallback to req.body.file_path
      let file_path = req.body.file_path || null;
      if (req.file) {
        file_path = `/uploads/submissions/${req.file.filename}`;
      }

      const submissionId = await Task.submitTask({
        task_id,
        student_id: studentId,
        submission_text,
        file_path
      });

      res.status(201).json({ message: 'Task submitted successfully', submissionId });
    } catch (error) {
      console.error('Submit task error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getMySubmissions(req, res) {
    try {
      const studentId = req.user.id;
      const [rows] = await pool.execute(
        `SELECT s.*, t.title as task_title 
         FROM Submissions s 
         JOIN Tasks t ON s.task_id = t.id 
         WHERE s.student_id = ? 
         ORDER BY s.submitted_at DESC`,
        [studentId]
      );
      res.json(rows);
    } catch (error) {
      console.error('Get my submissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getMyInterviews(req, res) {
    try {
      const studentId = req.user.id;
      const query = `
        SELECT m.*, u.name as faculty_name, 
               e.communication_score, e.technical_score, e.confidence_score, 
               e.problem_solving_score as problem_solving, e.overall_score, 
               e.strengths, e.weaknesses as improvements, e.final_feedback as final_remarks
        FROM MockInterviews m
        JOIN Users u ON m.faculty_id = u.id
        LEFT JOIN InterviewEvaluations e ON m.id = e.session_id
        WHERE m.student_id = ?
        ORDER BY m.scheduled_at DESC
      `;
      const [interviews] = await pool.execute(query, [studentId]);
      res.json(interviews);
    } catch (error) {
      console.error('Get my interviews error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getMyMentoringSessions(req, res) {
    try {
      const studentId = req.user.id;
      const query = `
        SELECT ms.*, u.name as faculty_name
        FROM MentoringSessions ms
        JOIN Users u ON ms.faculty_id = u.id
        WHERE ms.student_id = ?
        ORDER BY ms.session_date DESC
      `;
      const [sessions] = await pool.execute(query, [studentId]);
      res.json(sessions);
    } catch (error) {
      console.error('Get my mentoring sessions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getRecentActivity(req, res) {
    try {
      const studentId = req.user.id;
      
      // 1. Fetch recent task submissions
      const [submissions] = await pool.execute(
        `SELECT s.id, s.status, s.submitted_at as date, t.title as task_title, 'task_submission' as type 
         FROM Submissions s 
         JOIN Tasks t ON s.task_id = t.id 
         WHERE s.student_id = ? 
         ORDER BY s.submitted_at DESC LIMIT 5`,
        [studentId]
      );

      // 2. Fetch recent main project steps progress
      const [mainProgress] = await pool.execute(
        `SELECT sp.id, sp.status, sp.submitted_at as date, p.title as project_title, s.title as step_title, s.step_order, 'step_progress' as type 
         FROM StudentProgress sp 
         JOIN Projects p ON sp.project_id = p.id 
         JOIN Steps s ON sp.step_id = s.id 
         WHERE sp.user_id = ? 
         ORDER BY sp.submitted_at DESC LIMIT 5`,
        [studentId]
      );

      // 3. Fetch recent simple project steps progress
      const [simpleProgress] = await pool.execute(
        `SELECT sp.id, 'approved' as status, sp.completion_time as date, p.title as project_title, s.title as step_title, s.step_order, 'simple_step' as type 
         FROM StepProgress sp 
         JOIN Projects p ON sp.project_id = p.id 
         JOIN Steps s ON sp.step_id = s.id 
         WHERE sp.user_id = ? AND sp.completed = TRUE 
         ORDER BY sp.completion_time DESC LIMIT 5`,
        [studentId]
      );

      // 4. Fetch recent mock interviews
      const [interviews] = await pool.execute(
        `SELECT mi.id, mi.status, mi.scheduled_at as date, mi.title, f.name as faculty_name, 'mock_interview' as type 
         FROM MockInterviews mi 
         JOIN Users f ON mi.faculty_id = f.id 
         WHERE mi.student_id = ? 
         ORDER BY mi.scheduled_at DESC LIMIT 5`,
        [studentId]
      );

      // 5. Fetch recent mentoring sessions
      const [mentoring] = await pool.execute(
        `SELECT ms.id, 'completed' as status, ms.session_date as date, ms.topic as title, f.name as faculty_name, 'mentoring' as type 
         FROM MentoringSessions ms 
         JOIN Users f ON ms.faculty_id = f.id 
         WHERE ms.student_id = ? 
         ORDER BY ms.session_date DESC LIMIT 5`,
        [studentId]
      );

      // Combine, format, and sort all activities by date descending
      const activities = [
        ...submissions.map(x => ({ ...x, title: `Submitted task: ${x.task_title}` })),
        ...mainProgress.map(x => ({ ...x, title: `Submitted step: ${x.step_title} (${x.project_title})` })),
        ...simpleProgress.map(x => ({ ...x, title: `Completed step: ${x.step_title} (${x.project_title})` })),
        ...interviews.map(x => ({ ...x, title: `Interview: ${x.title} with ${x.faculty_name}` })),
        ...mentoring.map(x => ({ ...x, title: `Mentoring session: ${x.title} with ${x.faculty_name}` }))
      ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

      res.json(activities);
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = studentController;
