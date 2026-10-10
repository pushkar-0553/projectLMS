const User = require('../models/userModel')
const bcrypt = require('bcryptjs')
const pool = require('../config/db')

const userController = {
  // Get all students (for admin)
  async getAllStudents(req, res) {
    try {
      const Course = require('../models/courseModel');
      const targetCourseId = await Course.resolveCourseId(req);
      const students = await User.findByRole('student', targetCourseId);
      res.json(students);
    } catch (error) {
      console.error('Get all students error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Create student (admin only)
  async createStudent(req, res) {
    try {
      const { name, email, mobile, batch, password, courseId } = req.body;

      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password || 'student123', 10);

      // Resolve target course
      const Course = require('../models/courseModel');
      const targetCourseId = courseId || await Course.resolveCourseId(req);

      // Create user with additional fields
      const userId = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'student',
        mobile,
        batch
      });

      // Auto-enroll in course membership
      if (targetCourseId) {
        const CourseMembership = require('../models/courseMembershipModel');
        await CourseMembership.enroll({
          userId,
          courseId: targetCourseId,
          role: 'student'
        });

        // If batch provided, map into StudentBatchMap
        if (batch) {
          let batchId = parseInt(batch, 10);
          if (isNaN(batchId)) {
            const [bRows] = await pool.execute('SELECT id FROM Batches WHERE name = ? AND course_id = ? LIMIT 1', [batch, targetCourseId]);
            if (bRows.length > 0) batchId = bRows[0].id;
          }
          if (batchId && !isNaN(batchId)) {
            await pool.execute(
              'INSERT IGNORE INTO StudentBatchMap (student_id, batch_id) VALUES (?, ?)',
              [userId, batchId]
            );
          }
        }
      }

      res.status(201).json({
        message: 'Student created successfully',
        user: {
          id: userId,
          name,
          email,
          mobile,
          batch,
          role: 'student',
          course_id: targetCourseId
        }
      });
    } catch (error) {
      console.error('Create student error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete student (admin only)
  async deleteStudent(req, res) {
    try {
      const { id } = req.params
      await User.delete(id)
      res.json({ message: 'Student deleted successfully' })
    } catch (error) {
      console.error('Delete student error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id)
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }
      res.json(user)
    } catch (error) {
      console.error('Get profile error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const targetUserId = (req.body.userId && ['admin', 'super_admin'].includes(req.user.role))
        ? parseInt(req.body.userId, 10)
        : req.user.id;

      const {
        name, email, mobile, phone, batch, domain,
        college, passout_year, current_location, skills, github, linkedin
      } = req.body;

      if (email) {
        const trimmedEmail = email.trim().toLowerCase();
        const [existing] = await pool.execute(
          'SELECT id FROM Users WHERE email = ? AND id != ?',
          [trimmedEmail, targetUserId]
        );
        if (existing.length > 0) {
          return res.status(400).json({ message: 'Email address is already in use by another account' });
        }
      }

      await User.update(targetUserId, {
        name: name !== undefined ? name.trim() : undefined,
        email: email !== undefined ? email.trim().toLowerCase() : undefined,
        mobile: mobile !== undefined ? mobile.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        batch: batch !== undefined ? batch : undefined,
        domain: domain !== undefined ? domain.trim() : undefined,
        college: college !== undefined ? college.trim() : undefined,
        passout_year: passout_year !== undefined ? (passout_year ? parseInt(passout_year, 10) : null) : undefined,
        current_location: current_location !== undefined ? current_location.trim() : undefined,
        skills: skills !== undefined ? skills.trim() : undefined,
        github: github !== undefined ? github.trim() : undefined,
        linkedin: linkedin !== undefined ? linkedin.trim() : undefined
      });

      const updatedUser = await User.findById(targetUserId);

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error: ' + error.message });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = req.user.id

      // Get user with password
      const user = await User.findByIdWithPassword(userId)
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' })
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password
      await User.updatePassword(userId, hashedPassword)

      res.json({ message: 'Password changed successfully' })
    } catch (error) {
      console.error('Change password error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Create coordinator (admin only)
  async createCoordinator(req, res) {
    try {
      const { name, email, mobile, batch, password } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      // Check if coordinator already exists
      const existingCoordinator = await User.findByEmail(email);
      if (existingCoordinator) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Hash password (default: coordinator123)
      const hashedPassword = await bcrypt.hash(password || 'coordinator123', 10);

      // Create coordinator using object-based create method
      const coordinatorId = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'coordinator',
        mobile: mobile || null,
        batch: batch || null
      });

      res.status(201).json({
        message: 'Coordinator created successfully',
        coordinator: {
          id: coordinatorId,
          name,
          email,
          mobile,
          batch,
          role: 'coordinator'
        }
      });
    } catch (error) {
      console.error('Create coordinator error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get all coordinators (admin only)
  async getAllCoordinators(req, res) {
    try {
      const coordinators = await User.findByRole('coordinator');
      res.json(coordinators);
    } catch (error) {
      console.error('Get coordinators error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete coordinator (admin only)
  async deleteCoordinator(req, res) {
    try {
      const { id } = req.params;
      await User.delete(id);
      res.json({ message: 'Coordinator deleted successfully' });
    } catch (error) {
      console.error('Delete coordinator error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Create faculty (admin only)
  async createFaculty(req, res) {
    try {
      const { name, email, mobile, password, specialisation, bio, courseId } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      // Check if faculty already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Hash password (default: faculty123)
      const hashedPassword = await bcrypt.hash(password || 'faculty123', 10);

      // Resolve target course
      const Course = require('../models/courseModel');
      const targetCourseId = courseId || await Course.resolveCourseId(req);

      // Create faculty user
      const userId = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'faculty',
        mobile: mobile || null
      });

      // Create faculty profile
      await pool.execute(
        'INSERT INTO FacultyProfiles (user_id, specialisation, bio) VALUES (?, ?, ?)',
        [userId, specialisation || '', bio || '']
      );

      // Auto-enroll in course membership
      if (targetCourseId) {
        const CourseMembership = require('../models/courseMembershipModel');
        await CourseMembership.enroll({
          userId,
          courseId: targetCourseId,
          role: 'faculty'
        });
      }

      res.status(201).json({
        message: 'Faculty created successfully',
        faculty: {
          id: userId,
          name,
          email,
          role: 'faculty',
          course_id: targetCourseId
        }
      });
    } catch (error) {
      console.error('Create faculty error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get all faculties (admin only)
  async getAllFaculties(req, res) {
    try {
      const Course = require('../models/courseModel');
      const targetCourseId = await Course.resolveCourseId(req);
      const faculties = await User.findByRole('faculty', targetCourseId);
      
      if (!faculties || faculties.length === 0) {
        return res.json([]);
      }

      // Fetch batches for all faculties in a single query
      const facultyIds = faculties.map(f => f.id);
      const placeholders = facultyIds.map(() => '?').join(',');
      const [batchRows] = await pool.execute(
        `SELECT fbm.faculty_id, b.id, b.name 
         FROM Batches b
         JOIN FacultyBatchMap fbm ON b.id = fbm.batch_id
         WHERE fbm.faculty_id IN (${placeholders})`,
        facultyIds
      );

      const batchesByFaculty = {};
      for (const row of batchRows) {
        if (!batchesByFaculty[row.faculty_id]) batchesByFaculty[row.faculty_id] = [];
        batchesByFaculty[row.faculty_id].push({ id: row.id, name: row.name });
      }

      const facultiesWithBatches = faculties.map(faculty => ({
        ...faculty,
        batches: batchesByFaculty[faculty.id] || []
      }));
      
      res.json(facultiesWithBatches);
    } catch (error) {
      console.error('Get faculties error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Bulk create students (admin only)
  async bulkCreateStudents(req, res) {
    try {
      const { students } = req.body; // Expects array of { name, email, mobile, batch, password }
      
      if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: 'No student data provided' });
      }

      // Resolve course context
      let targetCourseId = req.body.courseId || req.body.course_id || req.courseId;
      if (!targetCourseId && req.headers['x-course-slug']) {
        const Course = require('../models/courseModel');
        const c = await Course.findBySlug(req.headers['x-course-slug']);
        if (c) targetCourseId = c.id;
      }
      if (!targetCourseId && req.user && req.user.course_id && req.user.role !== 'super_admin') {
        targetCourseId = req.user.course_id;
      }
      if (!targetCourseId) {
        targetCourseId = 1; // Default to MERN course
      }

      // Check for existing emails
      const emails = students.map(s => s.email);
      const [existingUsers] = await pool.query('SELECT email FROM Users WHERE email IN (?)', [emails]);
      const existingEmails = existingUsers.map(u => u.email);

      // Filter out students that already exist
      const newStudentsData = students.filter(s => !existingEmails.includes(s.email));

      if (newStudentsData.length === 0) {
        return res.status(400).json({ 
          message: 'All students in the list already exist',
          existingCount: existingEmails.length
        });
      }

      // Prepare data for bulk insert
      const hashedStudents = await Promise.all(newStudentsData.map(async (s) => {
        const hashedPassword = await bcrypt.hash(s.password || 'student123', 10);
        return {
          ...s,
          password: hashedPassword,
          role: 'student'
        };
      }));

      const insertedCount = await User.bulkCreate(hashedStudents);

      // Fetch newly created users and enroll in CourseMemberships & StudentBatchMap
      const [createdUsers] = await pool.query('SELECT id, email, batch FROM Users WHERE email IN (?)', [newStudentsData.map(s => s.email)]);
      for (const u of createdUsers) {
        await pool.execute(
          'INSERT IGNORE INTO CourseMemberships (course_id, user_id, role, status) VALUES (?, ?, "student", "active")',
          [targetCourseId, u.id]
        );
        if (u.batch) {
          let batchId = parseInt(u.batch, 10);
          if (isNaN(batchId)) {
            const [bRows] = await pool.execute('SELECT id FROM Batches WHERE name = ? AND course_id = ? LIMIT 1', [u.batch, targetCourseId]);
            if (bRows.length > 0) batchId = bRows[0].id;
          }
          if (batchId && !isNaN(batchId)) {
            await pool.execute(
              'INSERT IGNORE INTO StudentBatchMap (student_id, batch_id) VALUES (?, ?)',
              [u.id, batchId]
            );
          }
        }
      }

      res.status(201).json({
        message: `Successfully imported ${insertedCount} students`,
        skippedCount: existingEmails.length,
        totalCount: students.length,
        courseId: targetCourseId
      });
    } catch (error) {
      console.error('Bulk create students error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/users/students/:id/profile — full student profile for coordinator/admin
  async getStudentProfile(req, res) {
    try {
      const { id } = req.params;
      const pool = require('../config/db');
      const AttendanceModel = require('../models/attendanceModel');

      // Security check: Only allow coordinator, faculty, admin, super_admin, OR the student owner themselves
      if (!['coordinator', 'faculty', 'admin', 'super_admin'].includes(req.user.role) && req.user.id !== parseInt(id)) {
        return res.status(403).json({ message: 'Access denied. You cannot view this profile.' });
      }

      // Basic student info
      const student = await User.findById(id);
      if (!student) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If user is not student (e.g. coordinator or admin viewing their own profile)
      if (student.role !== 'student') {
        const [courseRows] = await pool.execute(
          `SELECT c.id, c.name, c.code, c.slug, cm.role, cm.status, cm.enrolled_at
           FROM Courses c
           JOIN CourseMemberships cm ON c.id = cm.course_id
           WHERE cm.user_id = ? AND cm.status = 'active'`,
          [id]
        );
        return res.json({
          student: { ...student, courses: courseRows },
          currentBatch: null,
          progress: [],
          progressStats: { approved: 0, pending: 0, rejected: 0, total: 0 },
          attendance: { percentage: 100, present: 0, total: 0 }
        });
      }

      // Enrolled courses
      const [courseRows] = await pool.execute(
        `SELECT c.id, c.name, c.code, c.slug, cm.role, cm.status, cm.enrolled_at
         FROM Courses c
         JOIN CourseMemberships cm ON c.id = cm.course_id
         WHERE cm.user_id = ? AND cm.status = 'active'`,
        [id]
      );

      // Current batch
      const currentBatch = await AttendanceModel.getStudentBatch(id);

      // Project progress (last 20 submissions)
      let courseFilter = '';
      const progressParams = [id];
      let profileCourseId = req.query.courseId;
      if (!profileCourseId && req.headers['x-course-slug']) {
        const Course = require('../models/courseModel');
        const c = await Course.findBySlug(req.headers['x-course-slug']);
        if (c) profileCourseId = c.id;
      }
      if (profileCourseId) {
        courseFilter = ' AND p.course_id = ?';
        progressParams.push(profileCourseId);
      }

      const [progressRows] = await pool.execute(
        `SELECT sp.id, sp.status, sp.submitted_at, sp.reviewed_at, sp.feedback,
                p.title as project_title, p.level,
                s.title as step_title, s.step_order
         FROM StudentProgress sp
         JOIN Projects p ON sp.project_id = p.id
         JOIN Steps s ON sp.step_id = s.id
         WHERE sp.user_id = ?${courseFilter}
         ORDER BY sp.submitted_at DESC
         LIMIT 20`,
        progressParams
      );

      // Attendance summary (last 30 days)
      const today = new Date().toISOString().slice(0, 10);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);

      let attendanceSummary = { total: 0, present: 0, absent: 0, late: 0, percentage: 0 };
      if (currentBatch) {
        const records = await AttendanceModel.getStudentSummary(
          id, currentBatch.id, thirtyDaysAgo, today
        );
        const total = records.length;
        const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
        attendanceSummary = {
          total,
          present,
          absent: records.filter(r => r.status === 'absent').length,
          late: records.filter(r => r.status === 'late').length,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
          recentRecords: records.slice(0, 10)
        };
      }

      // Submission stats
      const approved = progressRows.filter(p => p.status === 'approved').length;
      const pending = progressRows.filter(p => p.status === 'pending').length;
      const rejected = progressRows.filter(p => p.status === 'rejected').length;

      res.json({
        student: {
          ...student,
          course_name: courseRows[0]?.name || null,
          course_code: courseRows[0]?.code || null,
          course_slug: courseRows[0]?.slug || null,
          courses: courseRows
        },
        courses: courseRows,
        currentBatch,
        progress: progressRows,
        progressStats: { approved, pending, rejected, total: progressRows.length },
        attendance: attendanceSummary
      });
    } catch (error) {
      console.error('getStudentProfile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/users/batches — all active batches (for assignment dropdown)
  async getAllBatchesForAssignment(req, res) {
    try {
      const AttendanceModel = require('../models/attendanceModel');
      let courseId = req.query.courseId;
      if (!courseId && req.headers['x-course-slug']) {
        const Course = require('../models/courseModel');
        const c = await Course.findBySlug(req.headers['x-course-slug']);
        if (c) courseId = c.id;
      }
      if (!courseId && req.user && req.user.course_id && req.user.role !== 'super_admin') {
        courseId = req.user.course_id;
      }
      const batches = await AttendanceModel.getAllActiveBatches(courseId);
      res.json(batches);
    } catch (error) {
      console.error('getAllBatchesForAssignment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // PUT /api/users/students/:id/batch — assign or change student batch
  async assignStudentBatch(req, res) {
    try {
      const { id } = req.params;
      const { batchId } = req.body;

      if (!batchId) {
        return res.status(400).json({ message: 'batchId is required' });
      }

      const pool = require('../config/db');
      const AttendanceModel = require('../models/attendanceModel');

      // Verify student exists
      const student = await User.findById(id);
      if (!student || student.role !== 'student') {
        return res.status(404).json({ message: 'Student not found' });
      }

      await AttendanceModel.assignStudentToBatch(id, batchId, req.user.id);
      res.json({ message: 'Batch assigned successfully' });
    } catch (error) {
      console.error('assignStudentBatch error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // DELETE /api/users/students/:id/batch — remove student from batch
  async removeStudentBatch(req, res) {
    try {
      const { id } = req.params;
      const pool = require('../config/db');

      const [result] = await pool.execute(
        'DELETE FROM StudentBatchMap WHERE student_id = ?',
        [id]
      );
      res.json({ message: 'Student removed from batch' });
    } catch (error) {
      console.error('removeStudentBatch error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // GET /api/users/faculties/:id/batches — get batches for a faculty
  async getFacultyBatches(req, res) {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute(
        `SELECT b.* FROM Batches b
         JOIN FacultyBatchMap fbm ON b.id = fbm.batch_id
         WHERE fbm.faculty_id = ?`,
        [id]
      );
      res.json(rows);
    } catch (error) {
      console.error('getFacultyBatches error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // POST /api/users/faculties/:id/batch — assign faculty to batch
  async assignFacultyToBatch(req, res) {
    try {
      const { id } = req.params;
      const { batchId } = req.body;

      await pool.execute(
        'INSERT IGNORE INTO FacultyBatchMap (faculty_id, batch_id) VALUES (?, ?)',
        [id, batchId]
      );
      res.json({ message: 'Faculty assigned to batch' });
    } catch (error) {
      console.error('assignFacultyToBatch error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // DELETE /api/users/faculties/:id/batch/:batchId — remove faculty from batch
  async removeFacultyFromBatch(req, res) {
    try {
      const { id, batchId } = req.params;
      await pool.execute(
        'DELETE FROM FacultyBatchMap WHERE faculty_id = ? AND batch_id = ?',
        [id, batchId]
      );
      res.json({ message: 'Faculty removed from batch' });
    } catch (error) {
      console.error('removeFacultyFromBatch error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = userController
