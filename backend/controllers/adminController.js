const User = require('../models/userModel');
const Batch = require('../models/batchModel');
const Activity = require('../models/activityModel');
const { logActivity } = require('../utils/auditLogger');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, mobile, courseId } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const userId = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      mobile
    });

    // Auto-enroll in course membership if course context is present
    let targetCourseId = courseId || req.courseId;
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

    if (targetCourseId) {
      const CourseMembership = require('../models/courseMembershipModel');
      await CourseMembership.enroll({
        userId,
        courseId: targetCourseId,
        role: role || 'student'
      });
    }

    // If batch provided and user is student, map into StudentBatchMap
    if (req.body.batch && (role === 'student' || !role)) {
      const pool = require('../config/db');
      let batchId = parseInt(req.body.batch, 10);
      if (isNaN(batchId)) {
        const [bRows] = await pool.execute('SELECT id FROM Batches WHERE name = ? AND course_id = ? LIMIT 1', [req.body.batch, targetCourseId]);
        if (bRows.length > 0) batchId = bRows[0].id;
      }
      if (batchId && !isNaN(batchId)) {
        await pool.execute(
          'INSERT IGNORE INTO StudentBatchMap (student_id, batch_id) VALUES (?, ?)',
          [userId, batchId]
        );
      }
    }
    
    // Log activity
    await logActivity(
      req.user.id,
      req.user.role || 'admin',
      'CREATE_USER',
      'user',
      userId,
      `Created new ${role}: ${name} (${email})`
    );
    
    res.status(201).json({ message: 'User created successfully', userId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { name, classLink, courseId, studentIds } = req.body;
    let targetCourseId = courseId || req.courseId;
    if (!targetCourseId && req.headers['x-course-slug']) {
      const Course = require('../models/courseModel');
      const c = await Course.findBySlug(req.headers['x-course-slug']);
      if (c) targetCourseId = c.id;
    }
    if (!targetCourseId && req.user && req.user.course_id && req.user.role !== 'super_admin') {
      targetCourseId = req.user.course_id;
    }
    const batchId = await Batch.create(name, classLink, targetCourseId || 1, studentIds || []);
    
    // Log activity
    await logActivity(
      req.user.id,
      req.user.role || 'admin',
      'CREATE_BATCH',
      'batch',
      batchId,
      `Created main batch: ${name}${studentIds?.length ? ` with ${studentIds.length} students` : ''}`
    );
    
    res.status(201).json({ message: 'Batch created successfully', batchId });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const deleted = await Batch.delete(batchId);
    if (!deleted) {
      return res.status(404).json({ message: 'Batch not found or already deleted' });
    }

    await logActivity(
      req.user.id,
      req.user.role || 'admin',
      'DELETE_BATCH',
      'batch',
      Number(batchId),
      `Deleted batch ID: ${batchId}`
    );

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ message: 'Server error deleting batch' });
  }
};

exports.bulkAssignStudents = async (req, res) => {
  try {
    const { studentIds, batchId } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required' });
    }

    const assignedCount = await Batch.bulkAssignStudents(studentIds, batchId || null);

    await logActivity(
      req.user.id,
      req.user.role || 'admin',
      'BULK_ASSIGN_BATCH',
      'batch',
      batchId ? Number(batchId) : null,
      `Assigned ${assignedCount} students to batch ${batchId || 'Unassigned'}`
    );

    res.json({ message: `Successfully assigned ${assignedCount} students to batch`, count: assignedCount });
  } catch (error) {
    console.error('Error bulk assigning students to batch:', error);
    res.status(500).json({ message: error.message || 'Server error assigning students to batch' });
  }
};

exports.updateBatchClassLink = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { classLink } = req.body;

    const updated = await Batch.updateClassLink(batchId, classLink);
    if (!updated) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    await logActivity(
      req.user.id,
      'admin',
      'UPDATE_CLASS_LINK',
      'batch',
      Number(batchId),
      `Updated class link for batch ID: ${batchId}`
    );

    res.json({ message: 'Class link updated successfully' });
  } catch (error) {
    console.error('Error updating class link:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const Course = require('../models/courseModel');
    const courseId = await Course.resolveCourseId(req);
    const batches = await Batch.getBatchHierarchy(courseId);
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCoordinators = async (req, res) => {
  try {
    const Course = require('../models/courseModel');
    const courseId = await Course.resolveCourseId(req);
    const coordinators = await User.findByRole('coordinator', courseId);
    res.json(coordinators);
  } catch (error) {
    console.error('Error fetching coordinators:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getFaculties = async (req, res) => {
  try {
    const Course = require('../models/courseModel');
    const courseId = await Course.resolveCourseId(req);
    const faculties = await User.findByRole('faculty', courseId);
    res.json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const Course = require('../models/courseModel');
    const courseId = await Course.resolveCourseId(req);
    const students = await User.findByRole('student', courseId);
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = req.query.offset !== undefined ? parseInt(req.query.offset, 10) : (page - 1) * limit;

    const history = await Activity.getAll(limit, offset);
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Issue #8 fix: Add delete user handler
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.delete(id);

    await logActivity(
      req.user.id,
      'admin',
      'DELETE_USER',
      'user',
      parseInt(id),
      `Deleted ${user.role}: ${user.name} (${user.email})`
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
