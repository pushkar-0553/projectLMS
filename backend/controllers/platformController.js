// Student Execution & Mentorship Platform - Core Controller
// Comprehensive business logic for all platform modules

const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const NotificationModel = require('../models/notificationModel');

class PlatformController {
  // =============================================
  // USER MANAGEMENT
  // =============================================

  async getAllUsers(req, res) {
    try {
      const { role, search, limit, page } = req.query;
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const pageNum  = Math.max(1, parseInt(page, 10) || 1);
      const offset   = (pageNum - 1) * limitNum;
      
      let query = `
        SELECT u.id, u.username, u.email, u.role, u.name,
               u.phone, u.is_active, u.last_login, u.created_at,
               COALESCE(f.employee_id, NULL) as employee_id,
               COALESCE(f.department, NULL) as department,
               COALESCE(f.rating, 0) as faculty_rating
        FROM Users u
        LEFT JOIN Faculty f ON u.id = f.user_id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (role) {
        query += ' AND u.role = ?';
        params.push(role);
      }
      
      if (search) {
        query += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ` ORDER BY u.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
      
      const [users] = await db.execute(query, params);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM Users u WHERE 1=1';
      const countParams = [];
      
      if (role) {
        countQuery += ' AND u.role = ?';
        countParams.push(role);
      }
      
      if (search) {
        countQuery += ' AND (u.name LIKE ? OR u.email LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }
      
      const [countResult] = await db.execute(countQuery, countParams);
      
      res.json({
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limitNum)
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      // Users can only view their own profile unless they're admin/coordinator
      if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && req.user.id !== parseInt(id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const query = `
        SELECT u.id, u.username, u.email, u.role, u.name,
               u.phone, u.profile_image, u.is_active, u.last_login, u.created_at,
               COALESCE(f.employee_id, NULL) as employee_id,
               COALESCE(f.department, NULL) as department,
               COALESCE(f.specialization, NULL) as specialization,
               COALESCE(f.experience_years, 0) as experience_years,
               COALESCE(f.qualification, NULL) as qualification,
               COALESCE(f.bio, NULL) as bio,
               COALESCE(f.rating, 0) as faculty_rating,
               COALESCE(f.total_sessions, 0) as total_sessions
        FROM Users u
        LEFT JOIN Faculty f ON u.id = f.user_id
        WHERE u.id = ?
      `;
      
      const [users] = await db.execute(query, [id]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(users[0]);
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, phone, profile_image } = req.body;
      
      // Users can only update their own profile unless they're admin
      if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const query = `
        UPDATE Users 
        SET name = ?, phone = ?, profile_image = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      await db.execute(query, [name, phone, profile_image, id]);
      
      // Log activity
      await this.logActivity(req.user.id, 'update', 'user', parseInt(id), null, { name, phone, profile_image });
      
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  async getUsersByRole(req, res) {
    try {
      const { role } = req.params;
      const { batch_id } = req.query;
      
      let query = `
        SELECT u.id, u.username, u.email, u.name, u.phone, u.is_active
        FROM Users u
        WHERE u.role = ?
      `;
      
      const params = [role];
      
      if (batch_id && role === 'student') {
        query += ` AND u.id IN (
          SELECT student_id FROM StudentBatches WHERE batch_id = ? AND status = 'active'
        )`;
        params.push(batch_id);
      }
      
      query += ' ORDER BY u.name';
      
      const [users] = await db.execute(query, params);
      
      res.json(users);
    } catch (error) {
      console.error('Get users by role error:', error);
      res.status(500).json({ error: 'Failed to fetch users by role' });
    }
  }

  // =============================================
  // BATCH MANAGEMENT
  // =============================================

  async getBatches(req, res) {
    try {
      const { coordinator_id, status } = req.query;
      const bLimitNum = Math.max(1, parseInt(req.query.limit, 10) || 20);
      const bPageNum  = Math.max(1, parseInt(req.query.page, 10) || 1);
      const bOffset   = (bPageNum - 1) * bLimitNum;
      
      let query = `
        SELECT b.*, u.name as coordinator_name,
               COUNT(sb.student_id) as enrolled_students
        FROM Batches b
        LEFT JOIN Users u ON b.coordinator_id = u.id
        LEFT JOIN StudentBatches sb ON b.id = sb.batch_id AND sb.status = 'active'
        WHERE 1=1
      `;
      
      const params = [];
      
      if (coordinator_id) {
        query += ' AND b.coordinator_id = ?';
        params.push(parseInt(coordinator_id, 10));
      }
      
      if (status) {
        query += ' AND b.status = ?';
        params.push(status);
      }
      
      query += ` GROUP BY b.id, u.name ORDER BY b.created_at DESC LIMIT ${bLimitNum} OFFSET ${bOffset}`;
      
      const [batches] = await db.execute(query, params);
      
      res.json(batches);
    } catch (error) {
      console.error('Get batches error:', error);
      res.status(500).json({ error: 'Failed to fetch batches' });
    }
  }

  async createBatch(req, res) {
    try {
      const { name, description, coordinator_id, start_date, end_date, max_students } = req.body;
      
      const query = `
        INSERT INTO Batches (name, description, coordinator_id, start_date, end_date, max_students)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await db.execute(query, [name, description, coordinator_id, start_date, end_date, max_students]);
      
      // Log activity
      await this.logActivity(req.user.id, 'create', 'batch', result.insertId, null, { name, coordinator_id });
      
      res.status(201).json({ 
        message: 'Batch created successfully', 
        id: result.insertId 
      });
    } catch (error) {
      console.error('Create batch error:', error);
      res.status(500).json({ error: 'Failed to create batch' });
    }
  }

  async getBatchStudents(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT u.id, u.username, u.email, u.name, u.phone,
               sbm.enrollment_date, sbm.status, sbm.performance_score, sbm.attendance_rate
        FROM Users u
        JOIN StudentBatches sbm ON u.id = sbm.student_id
        WHERE sbm.batch_id = ?
        ORDER BY u.name
      `;
      
      const [students] = await db.execute(query, [id]);
      
      res.json(students);
    } catch (error) {
      console.error('Get batch students error:', error);
      res.status(500).json({ error: 'Failed to fetch batch students' });
    }
  }

  // =============================================
  // PROJECT & TASK MANAGEMENT
  // =============================================

  async getProjects(req, res) {
    try {
      const { category, difficulty, limit, page } = req.query;
      const pLimit  = Math.max(1, parseInt(limit, 10) || 20);
      const pPage   = Math.max(1, parseInt(page, 10) || 1);
      const pOffset = (pPage - 1) * pLimit;
      
      let query = `
        SELECT p.*, u.name as created_by_name
        FROM Projects p
        LEFT JOIN Users u ON p.created_by = u.id
        WHERE p.is_active = TRUE
      `;
      
      const params = [];
      
      if (category) {
        query += ' AND p.category = ?';
        params.push(category);
      }
      
      if (difficulty) {
        query += ' AND p.difficulty_level = ?';
        params.push(difficulty);
      }
      
      query += ` ORDER BY p.created_at DESC LIMIT ${pLimit} OFFSET ${pOffset}`;
      
      const [projects] = await db.execute(query, params);
      
      res.json(projects);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  async createProject(req, res) {
    try {
      const { title, description, category, difficulty_level, estimated_hours, tags } = req.body;
      
      const query = `
        INSERT INTO Projects (title, description, category, difficulty_level, estimated_hours, tags, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await db.execute(query, [
        title, description, category, difficulty_level, estimated_hours, 
        JSON.stringify(tags || []), req.user.id
      ]);
      
      // Log activity
      await this.logActivity(req.user.id, 'create', 'project', result.insertId, null, { title, category });
      
      res.status(201).json({ 
        message: 'Project created successfully', 
        id: result.insertId 
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async assignProjectToStudent(req, res) {
    try {
      const { studentId } = req.params;
      const { project_id, due_date } = req.body;
      
      // Check if already assigned
      const [existing] = await db.execute(
        'SELECT id FROM StudentProjects WHERE student_id = ? AND project_id = ?',
        [studentId, project_id]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Project already assigned to this student' });
      }
      
      const query = `
        INSERT INTO StudentProjects (student_id, project_id, assigned_by, due_date)
        VALUES (?, ?, ?, ?)
      `;
      
      const [result] = await db.execute(query, [studentId, project_id, req.user.id, due_date]);
      
      // Initialize step progress
      const [steps] = await db.execute('SELECT id FROM ProjectSteps WHERE project_id = ?', [project_id]);
      
      for (const step of steps) {
        await db.execute(
          'INSERT INTO StepProgress (student_project_id, step_id) VALUES (?, ?)',
          [result.insertId, step.id]
        );
      }
      
      // Log activity
      await this.logActivity(req.user.id, 'assign', 'student_project', result.insertId, null, { student_id: studentId, project_id });
      
      // Create notification for student
      await this.createNotificationForUser(
        studentId,
        'New Project Assigned',
        `You have been assigned a new project: ${req.body.title || 'Untitled Project'}`,
        'deadline',
        'high',
        `/projects/${project_id}`
      );
      
      res.status(201).json({ 
        message: 'Project assigned successfully', 
        id: result.insertId 
      });
    } catch (error) {
      console.error('Assign project error:', error);
      res.status(500).json({ error: 'Failed to assign project' });
    }
  }

  async getStudentProjects(req, res) {
    try {
      const { studentId } = req.params;
      const { status } = req.query;
      
      let query = `
        SELECT sp.*, p.title, p.category, p.difficulty_level, p.estimated_hours,
               u.name as assigned_by_name
        FROM StudentProjects sp
        JOIN Projects p ON sp.project_id = p.id
        LEFT JOIN Users u ON sp.assigned_by = u.id
        WHERE sp.student_id = ?
      `;
      
      const params = [studentId];
      
      if (status) {
        query += ' AND sp.status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY sp.assigned_date DESC';
      
      const [projects] = await db.execute(query, params);
      
      // Get step progress for each project
      for (const project of projects) {
        const [steps] = await db.execute(`
          SELECT ps.*, sp.status as step_status, sp.completed_at
          FROM ProjectSteps ps
          LEFT JOIN StepProgress sp ON ps.id = sp.step_id AND sp.student_project_id = ?
          WHERE ps.project_id = ?
          ORDER BY ps.step_order
        `, [project.id, project.project_id]);
        
        project.steps = steps;
        
        // Calculate completion percentage
        const completedSteps = steps.filter(s => s.step_status === 'completed').length;
        project.completion_percentage = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
      }
      
      res.json(projects);
    } catch (error) {
      console.error('Get student projects error:', error);
      res.status(500).json({ error: 'Failed to fetch student projects' });
    }
  }

  // =============================================
  // LIVE CLASSROOM SYSTEM
  // =============================================

  async createSession(req, res) {
    try {
      const { title, description, session_type, batch_id, student_id, scheduled_start, scheduled_end, max_participants } = req.body;
      
      const meeting_id = uuidv4();
      const meeting_link = `https://meet.platform.com/${meeting_id}`;
      
      const query = `
        INSERT INTO LiveSessions 
        (title, description, session_type, host_id, batch_id, student_id, scheduled_start, scheduled_end, meeting_id, meeting_link, max_participants)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await db.execute(query, [
        title, description, session_type, req.user.id, batch_id, student_id || null,
        scheduled_start, scheduled_end, meeting_id, meeting_link, max_participants
      ]);
      
      // Log activity
      await this.logActivity(req.user.id, 'create', 'session', result.insertId, null, { title, session_type });
      
      // Notify batch students if it's a class
      if (session_type === 'class' && batch_id) {
        await this.notifyBatchStudents(batch_id, {
          title: 'New Class Scheduled',
          message: `A new class "${title}" has been scheduled for ${new Date(scheduled_start).toLocaleString()}`,
          type: 'class_reminder',
          priority: 'high',
          link: `/sessions/${result.insertId}`
        });
      }
      
      res.status(201).json({ 
        message: 'Session created successfully', 
        id: result.insertId,
        meeting_link
      });
    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }

  async getSessions(req, res) {
    try {
      const { session_type, status, batch_id, host_id, page = 1, limit = 20 } = req.query;
      const finalLimit = Math.max(1, parseInt(limit, 10) || 20);
      const finalPage  = Math.max(1, parseInt(page, 10) || 1);
      const finalOffset = (finalPage - 1) * finalLimit;
      
      let query = `
        SELECT ls.*, u.name as host_name,
               b.name as batch_name,
               COUNT(sp.participant_id) as participant_count
        FROM LiveSessions ls
        LEFT JOIN Users u ON ls.host_id = u.id
        LEFT JOIN Batches b ON ls.batch_id = b.id
        LEFT JOIN SessionParticipants sp ON ls.id = sp.session_id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (session_type) {
        query += ' AND ls.session_type = ?';
        params.push(session_type);
      }
      
      if (status) {
        query += ' AND ls.session_status = ?';
        params.push(status);
      }
      
      if (batch_id) {
        query += ' AND ls.batch_id = ?';
        params.push(batch_id);
      }
      
      if (host_id) {
        const resolvedHostId = host_id === 'current' ? parseInt(req.user.id) : parseInt(host_id);
        query += ' AND ls.host_id = ?';
        params.push(resolvedHostId);
      }
      
      // Interpolate LIMIT/OFFSET directly — values are safe integers from parseInt()
      query += ` GROUP BY ls.id, u.name, b.name ORDER BY ls.scheduled_start DESC LIMIT ${finalLimit} OFFSET ${finalOffset}`;
      
      const [sessions] = await db.execute(query, params);
      
      res.json(sessions);
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  }

  async startSession(req, res) {
    try {
      const { id } = req.params;
      
      // Verify host permissions
      const [session] = await db.execute(
        'SELECT * FROM LiveSessions WHERE id = ? AND host_id = ?',
        [id, req.user.id]
      );
      
      if (session.length === 0) {
        return res.status(403).json({ error: 'Access denied or session not found' });
      }
      
      await db.execute(
        'UPDATE LiveSessions SET session_status = "live", actual_start = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      // Log activity
      await this.logActivity(req.user.id, 'start', 'session', parseInt(id), null, null);
      
      // Notify participants
      await this.notifySessionParticipants(id, {
        title: 'Session Started',
        message: `The session "${session[0].title}" has started`,
        type: 'class_reminder',
        priority: 'urgent',
        link: `/sessions/${id}`
      });
      
      res.json({ message: 'Session started successfully' });
    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }

  async joinSession(req, res) {
    try {
      const { id } = req.params;
      
      // Verify session exists and is live
      const [session] = await db.execute(
        'SELECT * FROM LiveSessions WHERE id = ? AND session_status = "live"',
        [id]
      );
      
      if (session.length === 0) {
        return res.status(404).json({ error: 'Session not found or not live' });
      }
      
      // Check if already joined
      const [participant] = await db.execute(
        'SELECT * FROM SessionParticipants WHERE session_id = ? AND participant_id = ?',
        [id, req.user.id]
      );
      
      if (participant.length > 0) {
        return res.status(400).json({ error: 'Already joined session' });
      }
      
      // Add participant
      await db.execute(
        'INSERT INTO SessionParticipants (session_id, participant_id, join_time) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [id, req.user.id]
      );
      
      // Log activity
      await this.logActivity(req.user.id, 'join', 'session', parseInt(id), null, null);
      
      res.json({ 
        message: 'Joined session successfully',
        meeting_link: session[0].meeting_link
      });
    } catch (error) {
      console.error('Join session error:', error);
      res.status(500).json({ error: 'Failed to join session' });
    }
  }

  // =============================================
  // PERFORMANCE INTELLIGENCE
  // =============================================

  async getStudentPerformance(req, res) {
    try {
      const { studentId } = req.params;
      const { period = '30' } = req.query; // days
      
      const query = `
        SELECT sp.*, b.name as batch_name
        FROM StudentPerformance sp
        LEFT JOIN Batches b ON sp.batch_id = b.id
        WHERE sp.student_id = ? AND sp.metric_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
        ORDER BY sp.metric_date DESC
      `;
      
      const [performance] = await db.execute(query, [studentId, period]);
      
      // Get current metrics summary
      const [summary] = await db.execute(`
        SELECT 
          AVG(attendance_rate) as avg_attendance,
          AVG(task_completion_rate) as avg_completion,
          AVG(execution_score) as avg_execution,
          COUNT(*) as days_tracked
        FROM StudentPerformance 
        WHERE student_id = ? AND metric_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
      `, [studentId, period]);
      
      res.json({
        performance,
        summary: summary[0]
      });
    } catch (error) {
      console.error('Get student performance error:', error);
      res.status(500).json({ error: 'Failed to fetch student performance' });
    }
  }

  async getPerformanceAnalytics(req, res) {
    try {
      const { batch_id, period = '30' } = req.query;
      
      let query = `
        SELECT 
          AVG(attendance_rate) as avg_attendance,
          AVG(task_completion_rate) as avg_completion,
          AVG(execution_score) as avg_execution,
          COUNT(DISTINCT student_id) as total_students,
          SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk_students,
          SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk_students
        FROM StudentPerformance 
        WHERE metric_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
      `;
      
      const params = [period];
      
      if (batch_id) {
        query += ' AND batch_id = ?';
        params.push(batch_id);
      }
      
      const [analytics] = await db.execute(query, params);
      
      // Get trend data
      const [trends] = await db.execute(`
        SELECT 
          DATE(metric_date) as date,
          AVG(attendance_rate) as attendance,
          AVG(task_completion_rate) as completion,
          AVG(execution_score) as execution
        FROM StudentPerformance 
        WHERE metric_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
        ${batch_id ? 'AND batch_id = ?' : ''}
        GROUP BY DATE(metric_date)
        ORDER BY date
      `, batch_id ? [period, batch_id] : [period]);
      
      res.json({
        summary: analytics[0],
        trends
      });
    } catch (error) {
      console.error('Get performance analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch performance analytics' });
    }
  }

  async getRiskAnalysis(req, res) {
    try {
      const { batch_id, period = '30' } = req.query;
      
      // Basic implementation - count students by risk level
      const [riskCounts] = await db.execute(`
        SELECT 
          SUM(CASE WHEN risk_level = 'low' THEN 1 ELSE 0 END) as low_risk,
          SUM(CASE WHEN risk_level = 'medium' THEN 1 ELSE 0 END) as medium_risk,
          SUM(CASE WHEN risk_level = 'high' THEN 1 ELSE 0 END) as high_risk,
          SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_risk
        FROM StudentPerformance
        WHERE metric_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
        ${batch_id ? 'AND batch_id = ?' : ''}
      `, batch_id ? [period, batch_id] : [period]);
      
      res.json(riskCounts[0] || { low_risk: 0, medium_risk: 0, high_risk: 0, critical_risk: 0 });
    } catch (error) {
      console.error('Get risk analysis error:', error);
      res.status(500).json({ error: 'Failed to fetch risk analysis' });
    }
  }

  async getAttendanceAnalytics(req, res) {
    try {
      const { batch_id, period = '30' } = req.query;
      
      const [analytics] = await db.execute(`
        SELECT 
          DATE(metric_date) as date,
          AVG(attendance_rate) as attendance
        FROM StudentPerformance
        WHERE metric_date >= DATE_SUB(CURRENT_DATE, INTERVAL ? DAY)
        ${batch_id ? 'AND batch_id = ?' : ''}
        GROUP BY DATE(metric_date)
        ORDER BY date
      `, batch_id ? [period, batch_id] : [period]);
      
      res.json(analytics);
    } catch (error) {
      console.error('Get attendance analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch attendance analytics' });
    }
  }

  async getNotifications(req, res) {
    try {
      const limitNum = Number(req.query.limit) || 20;
      const offsetNum = Number(req.query.offset) || 0;
      
      const [notifications] = await db.execute(`
        SELECT n.*, u.name as sender_name 
        FROM Notifications n
        LEFT JOIN Users u ON n.sender_id = u.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [req.user.id]);
      
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async logActivity(userId, action, entityType, entityId, oldValues, newValues) {
    try {
      const query = `
        INSERT INTO ActivityLogs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.execute(query, [
        userId, action, entityType, entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        null, // IP address would come from request
        null  // User agent would come from request
      ]);
    } catch (error) {
      console.error('Log activity error:', error);
    }
  }

  async createNotificationForUser(userId, title, message, type, priority, link) {
    try {
      const query = `
        INSERT INTO Notifications (user_id, title, message, type, priority, link)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await db.execute(query, [userId, title, message, type, priority, link]);
    } catch (error) {
      console.error('Create notification error:', error);
    }
  }

  async notifyBatchStudents(batchId, notification) {
    try {
      const [students] = await db.execute(
        'SELECT student_id FROM StudentBatches WHERE batch_id = ? AND status = "active"',
        [batchId]
      );
      
      for (const student of students) {
        await this.createNotificationForUser(
          student.student_id,
          notification.title,
          notification.message,
          notification.type,
          notification.priority,
          notification.link
        );
      }
    } catch (error) {
      console.error('Notify batch students error:', error);
    }
  }

  async notifySessionParticipants(sessionId, notification) {
    try {
      const [participants] = await db.execute(
        'SELECT participant_id FROM SessionParticipants WHERE session_id = ?',
        [sessionId]
      );
      
      for (const participant of participants) {
        await this.createNotificationForUser(
          participant.participant_id,
          notification.title,
          notification.message,
          notification.type,
          notification.priority,
          notification.link
        );
      }
    } catch (error) {
      console.error('Notify session participants error:', error);
    }
  }

  // PLACEHOLDER METHODS TO PREVENT CRASHES
  async createNotification(req, res) {
    try {
      const { user_id, title, message, type, priority, link } = req.body;
      const id = await NotificationModel.createNotification(
        user_id,
        title,
        message,
        type,
        link,
        req.user.id
      );
      res.status(201).json({ id, message: 'Notification created' });
    } catch (error) {
      console.error('Create notification error:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }

  async markNotificationRead(req, res) {
    try {
      const { id } = req.params;
      await NotificationModel.markAsRead(id, req.user.id);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async markAllNotificationsRead(req, res) {
    try {
      await NotificationModel.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      await NotificationModel.delete(id, req.user.id);
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
  async getBatchById(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async updateBatch(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async assignStudentsToBatch(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getProjectById(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async updateProject(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getProjectSteps(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async updateStudentProject(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async updateStepProgress(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async updateSession(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async endSession(req, res) {
    try {
      const { id } = req.params;
      
      const [session] = await db.execute('SELECT * FROM LiveSessions WHERE id = ?', [id]);
      if (session.length === 0) return res.status(404).json({ error: 'Session not found' });
      
      await db.execute(
        'UPDATE LiveSessions SET session_status = "ended", scheduled_end = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      // Calculate durations for participants
      await db.execute(`
        UPDATE SessionParticipants 
        SET leave_time = CURRENT_TIMESTAMP,
            duration_minutes = TIMESTAMPDIFF(MINUTE, join_time, CURRENT_TIMESTAMP)
        WHERE session_id = ? AND leave_time IS NULL
      `, [id]);
      
      await this.logActivity(req.user.id, 'end', 'session', parseInt(id), null, null);
      
      res.json({ message: 'Session ended successfully' });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ error: 'Failed to end session' });
    }
  }
  async leaveSession(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getSessionParticipants(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getInterviewSessions(req, res) {
    try {
      const { status, student_id } = req.query;
      let query = `
        SELECT ls.*, u.name as host_name, s.name as student_name, b.name as batch_name
        FROM LiveSessions ls
        LEFT JOIN Users u ON ls.host_id = u.id
        LEFT JOIN Users s ON ls.student_id = s.id
        LEFT JOIN Batches b ON ls.batch_id = b.id
        WHERE ls.session_type = "mock_interview"
      `;
      const params = [];

      if (status) {
        query += ' AND ls.session_status = ?';
        params.push(status);
      }
      if (student_id) {
        query += ' AND ls.student_id = ?';
        params.push(student_id);
      }
      if (req.user.role === 'faculty') {
        query += ' AND ls.host_id = ?';
        params.push(req.user.id);
      }

      query += ' ORDER BY ls.scheduled_start DESC';
      const [sessions] = await db.execute(query, params);
      res.json(sessions);
    } catch (error) {
      console.error('Get interview sessions error:', error);
      res.status(500).json({ error: 'Failed to fetch interview sessions' });
    }
  }

  async scheduleInterview(req, res) {
    try {
      const { student_id, batch_id, scheduled_start, scheduled_end, title, description } = req.body;
      
      const query = `
        INSERT INTO LiveSessions (
          title, description, session_type, host_id, student_id, batch_id, 
          scheduled_start, scheduled_end, session_status
        ) VALUES (?, ?, 'mock_interview', ?, ?, ?, ?, ?, 'scheduled')
      `;
      
      const [result] = await db.execute(query, [
        title || 'Mock Interview',
        description || '',
        req.user.id,
        student_id,
        batch_id || null,
        scheduled_start,
        scheduled_end
      ]);
      
      await this.logActivity(req.user.id, 'schedule', 'interview', result.insertId, null, req.body);
      
      // Notify student
      await this.createNotificationForUser(
        student_id,
        'Interview Scheduled',
        `A mock interview "${title}" has been scheduled for you.`,
        'interview_reminder',
        'high',
        `/student/interviews`
      );
      
      res.status(201).json({ id: result.insertId, message: 'Interview scheduled successfully' });
    } catch (error) {
      console.error('Schedule interview error:', error);
      res.status(500).json({ error: 'Failed to schedule interview' });
    }
  }

  async submitInterviewEvaluation(req, res) {
    try {
      const { sessionId } = req.params;
      const { 
        communication_score, technical_score, confidence_score, 
        problem_solving_score, overall_score, strengths, 
        weaknesses, recommendations, final_feedback 
      } = req.body;

      // Get student_id from session
      const [session] = await db.execute('SELECT student_id FROM LiveSessions WHERE id = ?', [sessionId]);
      if (session.length === 0) return res.status(404).json({ error: 'Session not found' });
      const studentId = session[0].student_id;

      const query = `
        INSERT INTO InterviewEvaluations (
          session_id, evaluator_id, student_id, communication_score, 
          technical_score, confidence_score, problem_solving_score, 
          overall_score, strengths, weaknesses, recommendations, final_feedback
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          communication_score = VALUES(communication_score),
          technical_score = VALUES(technical_score),
          confidence_score = VALUES(confidence_score),
          problem_solving_score = VALUES(problem_solving_score),
          overall_score = VALUES(overall_score),
          strengths = VALUES(strengths),
          weaknesses = VALUES(weaknesses),
          recommendations = VALUES(recommendations),
          final_feedback = VALUES(final_feedback)
      `;

      await db.execute(query, [
        sessionId, req.user.id, studentId, communication_score,
        technical_score, confidence_score, problem_solving_score,
        overall_score, strengths, weaknesses, recommendations, final_feedback
      ]);

      // Update student performance record (increment interviews completed)
      await db.execute(`
        INSERT INTO StudentPerformance (student_id, batch_id, metric_date, interviews_completed)
        SELECT student_id, batch_id, CURRENT_DATE, 1 FROM LiveSessions WHERE id = ?
        ON DUPLICATE KEY UPDATE interviews_completed = interviews_completed + 1
      `, [sessionId]);

      await this.logActivity(req.user.id, 'evaluate', 'interview', parseInt(sessionId), null, null);

      res.json({ message: 'Evaluation submitted successfully' });
    } catch (error) {
      console.error('Submit evaluation error:', error);
      res.status(500).json({ error: 'Failed to submit evaluation' });
    }
  }

  async getInterviewEvaluations(req, res) {
    try {
      const { sessionId } = req.params;
      let query = `
        SELECT ie.*, u.name as evaluator_name, s.name as student_name, ls.title as session_title
        FROM InterviewEvaluations ie
        JOIN Users u ON ie.evaluator_id = u.id
        JOIN Users s ON ie.student_id = s.id
        JOIN LiveSessions ls ON ie.session_id = ls.id
      `;
      const params = [];

      if (sessionId) {
        query += ' WHERE ie.session_id = ?';
        params.push(sessionId);
      } else if (req.user.role === 'faculty') {
        query += ' WHERE ie.evaluator_id = ?';
        params.push(req.user.id);
      } else if (req.user.role === 'student') {
        query += ' WHERE ie.student_id = ?';
        params.push(req.user.id);
      }

      query += ' ORDER BY ie.evaluation_date DESC LIMIT 50';
      const [evaluations] = await db.execute(query, params);
      res.json(evaluations);
    } catch (error) {
      console.error('Get evaluations error:', error);
      res.status(500).json({ error: 'Failed to fetch evaluations' });
    }
  }

  async getStudentInterviewHistory(req, res) {
    try {
      const { studentId } = req.params;
      const query = `
        SELECT ls.*, ie.overall_score, u.name as interviewer_name
        FROM LiveSessions ls
        LEFT JOIN InterviewEvaluations ie ON ls.id = ie.session_id
        LEFT JOIN Users u ON ls.host_id = u.id
        WHERE ls.student_id = ? AND ls.session_type = "mock_interview"
        ORDER BY ls.scheduled_start DESC
      `;
      const [history] = await db.execute(query, [studentId]);
      res.json(history);
    } catch (error) {
      console.error('Get student interview history error:', error);
      res.status(500).json({ error: 'Failed to fetch interview history' });
    }
  }
  async getBatchPerformance(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getLeaderboard(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async calculatePerformanceMetrics(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getAttendanceRecords(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getSessionAttendance(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async takeManualAttendance(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getSystemOverview(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getActivityLogs(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getBatchComparisons(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getFacultyPerformance(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getSystemSettings(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async updateSystemSetting(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getPublicSettings(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getActiveSessions(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getOnlineUsers(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getBatchActivity(req, res) { res.status(501).json({ error: 'Not implemented' }); }
  async getSessionById(req, res) { res.status(501).json({ error: 'Not implemented' }); }

  async sendBulkNotifications(req, res) {
    try {
      const { recipient_ids, title, message, type, priority, link } = req.body;
      if (!Array.isArray(recipient_ids)) {
        return res.status(400).json({ error: 'recipient_ids must be an array' });
      }

      for (const id of recipient_ids) {
        await NotificationModel.createNotification(id, title, message, type, link, req.user.id);
      }

      res.status(201).json({ message: `Sent ${recipient_ids.length} notifications` });
    } catch (error) {
      console.error('Bulk notification error:', error);
      res.status(500).json({ error: 'Failed to send bulk notifications' });
    }
  }
}

module.exports = new PlatformController();
