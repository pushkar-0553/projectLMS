const Course = require('../models/courseModel');
const CourseMembership = require('../models/courseMembershipModel');

/**
 * Middleware: Resolves course context from URL param (:courseSlug or :courseId) or header (X-Course-Slug)
 * Attaches req.course and req.courseId
 */
const resolveCourseContext = async (req, res, next) => {
  try {
    const slug = req.params.courseSlug || req.headers['x-course-slug'] || req.query.courseSlug;
    const courseId = req.params.courseId || req.query.courseId;

    let course = null;
    if (slug) {
      course = await Course.findBySlug(slug);
    } else if (courseId) {
      course = await Course.findById(courseId);
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course context '${slug || courseId || 'unspecified'}' could not be resolved.`
      });
    }

    // Inactive courses are inaccessible to non-super_admin users
    if (course.status !== 'active' && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: `Course '${course.name}' is currently inactive.`
      });
    }

    req.course = course;
    req.courseId = course.id;
    next();
  } catch (error) {
    console.error('Course resolution error:', error);
    res.status(500).json({ message: 'Internal server error resolving course context' });
  }
};

/**
 * Middleware: Verifies that authenticated user belongs to req.course and holds an allowed role
 */
const authorizeCourseAccess = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const course = req.course;

      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!course) {
        return res.status(400).json({ message: 'Course context must be resolved prior to authorization' });
      }

      // Platform Super Admin bypasses individual course membership restrictions
      if (user.role === 'super_admin') {
        req.courseRole = 'super_admin';
        return next();
      }

      // Verify course membership
      const membership = await CourseMembership.find(user.id, course.id);
      if (!membership || membership.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Access denied. You are not enrolled or assigned to course '${course.name}'.`
        });
      }

      // If specific course roles were required, enforce them
      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden. Role '${membership.role}' does not have permission for this resource.`
        });
      }

      req.courseMembership = membership;
      req.courseRole = membership.role;
      next();
    } catch (error) {
      console.error('Course authorization error:', error);
      res.status(500).json({ message: 'Internal server error authorizing course access' });
    }
  };
};

module.exports = {
  resolveCourseContext,
  authorizeCourseAccess
};
