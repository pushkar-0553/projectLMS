const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { resolveCourseContext, authorizeCourseAccess } = require('../middleware/courseMiddleware');
const { verifyToken } = require('../utils/token');
const User = require('../models/userModel');

// Optional auth middleware for public endpoints that can enrich with user data if logged in
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = verifyToken(token);
      const dbUser = await User.findById(decoded.id);
      if (dbUser) {
        req.user = dbUser;
      }
    } catch (e) {
      // Ignore invalid token for optional auth
    }
  }
  next();
};

// 1. Course Discovery & Context Resolution
router.get('/', optionalAuth, courseController.getAllCourses);
router.get('/my-courses', protect, courseController.getMyCourses);
router.get('/slug/:slug', optionalAuth, courseController.getCourseBySlug);

// 2. Super Admin Course Management
router.post('/', protect, authorize('super_admin'), courseController.createCourse);
router.put('/:id', protect, authorize('super_admin'), courseController.updateCourse);
router.delete('/:id', protect, authorize('super_admin'), courseController.deleteCourse);

// 3. Course-Scoped Membership & Staff Management
router.get(
  '/:courseId/members',
  protect,
  resolveCourseContext,
  authorizeCourseAccess('admin', 'coordinator'),
  courseController.getCourseMembers
);

router.post(
  '/:courseId/members',
  protect,
  resolveCourseContext,
  authorizeCourseAccess('admin'),
  courseController.assignMember
);

router.delete(
  '/:courseId/members/:userId',
  protect,
  resolveCourseContext,
  authorizeCourseAccess('admin'),
  courseController.removeMember
);

module.exports = router;
