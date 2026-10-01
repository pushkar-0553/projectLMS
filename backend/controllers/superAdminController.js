const pool = require('../config/db');
const User = require('../models/userModel');
const Course = require('../models/courseModel');

const superAdminController = {
  // Global Platform Overview Metrics
  async getPlatformOverview(req, res) {
    try {
      const [[courses]] = await pool.execute('SELECT COUNT(*) as count FROM Courses');
      const [[users]] = await pool.execute('SELECT COUNT(*) as count FROM Users');
      const [[students]] = await pool.execute("SELECT COUNT(*) as count FROM Users WHERE role = 'student'");
      const [[batches]] = await pool.execute('SELECT COUNT(*) as count FROM Batches');
      const [[projects]] = await pool.execute('SELECT COUNT(*) as count FROM Projects');
      const [[submissions]] = await pool.execute('SELECT COUNT(*) as count FROM Submissions');

      const allCourses = await Course.getAll(true);
      const courseSummaries = [];
      for (const c of allCourses) {
        const stats = await Course.getCourseStats(c.id);
        courseSummaries.push({
          ...c,
          stats
        });
      }

      res.json({
        success: true,
        metrics: {
          totalCourses: courses.count,
          totalUsers: users.count,
          totalStudents: students.count,
          totalBatches: batches.count,
          totalProjects: projects.count,
          totalSubmissions: submissions.count
        },
        courses: courseSummaries
      });
    } catch (error) {
      console.error('Super Admin overview error:', error);
      res.status(500).json({ success: false, message: 'Server error generating platform overview' });
    }
  },

  // Global user list across all courses
  async getAllUsers(req, res) {
    try {
      const [users] = await pool.execute(`
        SELECT u.id, u.name, u.email, u.role, u.created_at, u.mobile,
          (SELECT COUNT(*) FROM CourseMemberships cm WHERE cm.user_id = u.id AND cm.status = 'active') as active_courses_count
        FROM Users u
        ORDER BY u.created_at DESC
      `);
      res.json({ success: true, users });
    } catch (error) {
      console.error('Super Admin get users error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Platform Audit Trail
  async getAuditLogs(req, res) {
    try {
      const [logs] = await pool.execute(`
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM ActivityLogs al
        LEFT JOIN Users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 100
      `);
      res.json({ success: true, logs });
    } catch (error) {
      console.error('Super Admin audit logs error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Super Admin: Create or Assign a Course Admin for a particular course
  async createOrAssignCourseAdmin(req, res) {
    try {
      const bcrypt = require('bcryptjs');
      const CourseMembership = require('../models/courseMembershipModel');
      const { name, email, password, courseId, mobile } = req.body;

      if (!email || !courseId) {
        return res.status(400).json({ success: false, message: 'Email and Course ID are required' });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      let user = await User.findByEmail(email);
      let userId;

      if (!user) {
        if (!name || !password) {
          return res.status(400).json({ success: false, message: 'Name and password are required for new admin user' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        userId = await User.create({
          name,
          email,
          password: hashedPassword,
          role: 'admin',
          mobile: mobile || null
        });
        user = await User.findById(userId);
      } else {
        userId = user.id;
        // Promote user role to admin if currently student or coordinator
        if (user.role !== 'super_admin' && user.role !== 'admin') {
          await pool.execute('UPDATE Users SET role = "admin" WHERE id = ?', [userId]);
          user.role = 'admin';
        }
      }

      // Assign to CourseMemberships as admin
      await CourseMembership.enroll({
        userId,
        courseId: parseInt(courseId),
        role: 'admin'
      });

      res.status(201).json({
        success: true,
        message: `Admin '${user.name}' successfully assigned to ${course.name}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        course: {
          id: course.id,
          name: course.name,
          slug: course.slug
        }
      });
    } catch (error) {
      console.error('Assign course admin error:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error assigning course admin' });
    }
  },

  // Super Admin: Get all admins assigned to a course
  async getCourseAdmins(req, res) {
    try {
      const { courseId } = req.params;
      const [admins] = await pool.execute(`
        SELECT u.id, u.name, u.email, u.mobile, u.role, cm.created_at as assigned_at
        FROM CourseMemberships cm
        JOIN Users u ON cm.user_id = u.id
        WHERE cm.course_id = ? AND cm.role = 'admin' AND cm.status = 'active'
        ORDER BY cm.created_at ASC
      `, [courseId]);

      res.json({ success: true, admins });
    } catch (error) {
      console.error('Get course admins error:', error);
      res.status(500).json({ success: false, message: 'Server error fetching course admins' });
    }
  },

  // Super Admin: Remove admin from a course
  async removeCourseAdmin(req, res) {
    try {
      const { courseId, userId } = req.params;
      await pool.execute(
        'DELETE FROM CourseMemberships WHERE course_id = ? AND user_id = ? AND role = "admin"',
        [courseId, userId]
      );

      res.json({ success: true, message: 'Admin assignment removed from course successfully' });
    } catch (error) {
      console.error('Remove course admin error:', error);
      res.status(500).json({ success: false, message: 'Server error removing course admin' });
    }
  },

  // System Telemetry: Live Cloudinary, TiDB & Server Health Metrics
  async getSystemTelemetry(req, res) {
    try {
      const os = require('os');
      const cloudinaryService = require('../services/cloudinaryService');

      // 1. Live Cloudinary Usage Stats
      const cloudinaryStats = await cloudinaryService.getUsageStats();

      // 2. Cloudinary Resumes Per Course Breakdown
      const [resumesPerCourse] = await pool.execute(`
        SELECT 
          COALESCE(c.id, 0) as course_id,
          COALESCE(c.name, 'Unassigned / Global') as course_name,
          COALESCE(c.code, 'N/A') as course_code,
          COUNT(sr.id) as total_resumes,
          COUNT(CASE WHEN sr.cloudinary_url IS NOT NULL THEN 1 END) as cloudinary_resumes,
          COUNT(CASE WHEN sr.file_name IS NOT NULL AND sr.cloudinary_url IS NULL THEN 1 END) as local_resumes
        FROM student_resumes sr
        LEFT JOIN Courses c ON sr.course_id = c.id
        WHERE sr.is_latest = TRUE
        GROUP BY c.id, c.name, c.code
      `);

      // 3. TiDB Database Metrics via information_schema
      const [[dbSummary]] = await pool.execute(`
        SELECT 
          SUM(data_length + index_length) as db_size_bytes,
          SUM(table_rows) as total_rows,
          COUNT(*) as total_tables
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);

      const [topTables] = await pool.execute(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          (data_length + index_length) as total_size
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY (data_length + index_length) DESC
        LIMIT 12
      `);

      const [[connInfo]] = await pool.execute(`
        SELECT COUNT(*) as active_connections 
        FROM information_schema.processlist
      `);

      const [[versionInfo]] = await pool.execute(`
        SELECT VERSION() as db_version
      `);

      // 4. Server Host & Process Metrics
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsage = process.memoryUsage();
      const uptimeSec = Math.floor(process.uptime());
      const hours = Math.floor(uptimeSec / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      const seconds = uptimeSec % 60;
      const uptimeFormatted = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;

      const serverHealth = {
        status: 'healthy',
        uptime_seconds: uptimeSec,
        uptime_formatted: uptimeFormatted,
        node_version: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpu_count: os.cpus().length,
        memory: {
          heap_used_mb: (memUsage.heapUsed / (1024 * 1024)).toFixed(1),
          heap_total_mb: (memUsage.heapTotal / (1024 * 1024)).toFixed(1),
          rss_mb: (memUsage.rss / (1024 * 1024)).toFixed(1),
          system_free_mb: (freeMem / (1024 * 1024)).toFixed(1),
          system_total_mb: (totalMem / (1024 * 1024)).toFixed(1),
          used_percent: Math.round((usedMem / totalMem) * 100)
        }
      };

      const totalDbBytes = Number(dbSummary.db_size_bytes) || 0;
      const tidbData = {
        status: 'connected',
        version: versionInfo.db_version,
        database_name: process.env.DB_NAME || 'lms_db',
        total_size_mb: (totalDbBytes / (1024 * 1024)).toFixed(2),
        total_tables: Number(dbSummary.total_tables) || 0,
        total_records: Number(dbSummary.total_rows) || 0,
        active_connections: Number(connInfo.active_connections) || 1,
        top_tables: topTables.map(t => ({
          table_name: t.table_name,
          table_rows: Number(t.table_rows) || 0,
          data_mb: ((Number(t.data_length) || 0) / (1024 * 1024)).toFixed(2),
          index_mb: ((Number(t.index_length) || 0) / (1024 * 1024)).toFixed(2),
          total_mb: ((Number(t.total_size) || 0) / (1024 * 1024)).toFixed(2)
        }))
      };

      const storageBytes = cloudinaryStats.storage?.usageBytes || cloudinaryStats.storage?.usage || 0;
      const bandwidthBytes = cloudinaryStats.bandwidth?.usageBytes || cloudinaryStats.bandwidth?.usage || 0;
      const creditsUsage = cloudinaryStats.credits?.usage || 0;
      const creditsLimit = cloudinaryStats.credits?.limit || 25;

      const cloudinaryData = {
        plan: cloudinaryStats.plan || 'Free',
        status: 'connected',
        storage: {
          used_bytes: storageBytes,
          used_mb: (storageBytes / (1024 * 1024)).toFixed(2),
          used_percent: ((storageBytes / (1024 * 1024 * 1024)) * 100).toFixed(2)
        },
        bandwidth: {
          used_bytes: bandwidthBytes,
          used_mb: (bandwidthBytes / (1024 * 1024)).toFixed(2),
          used_percent: ((bandwidthBytes / (1024 * 1024 * 1024)) * 100).toFixed(2)
        },
        credits: {
          used: creditsUsage,
          limit: creditsLimit,
          remaining: Math.max(0, creditsLimit - creditsUsage).toFixed(2),
          used_percent: cloudinaryStats.credits?.usedPercent || 0
        },
        resources: {
          objects: cloudinaryStats.resources || cloudinaryStats.objects?.usage || 0,
          transformations: cloudinaryStats.transformations || 0
        },
        rate_limit: {
          limit: cloudinaryStats.rateLimit?.allowed || 500,
          remaining: cloudinaryStats.rateLimit?.remaining || 500
        },
        resumes_by_course: resumesPerCourse
      };

      const payload = {
        success: true,
        timestamp: new Date().toISOString(),
        cloudinary: cloudinaryData,
        tidb: tidbData,
        server: serverHealth
      };

      res.json({
        ...payload,
        telemetry: payload
      });
    } catch (error) {
      console.error('Super Admin system telemetry error:', error);
      res.status(500).json({ success: false, message: error.message || 'Server error fetching telemetry' });
    }
  }
};

module.exports = superAdminController;
