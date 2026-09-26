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
  }
};

module.exports = superAdminController;
