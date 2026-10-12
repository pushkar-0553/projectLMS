const { authenticateToken } = require('./authMiddleware');
const User = require('../models/userModel');

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      // Fast Path: req.user is already authenticated by authenticateToken middleware
      if (req.user && req.user.role) {
        if (!roles.includes(req.user.role) && req.user.role !== 'super_admin') {
          return res.status(403).json({ 
            message: 'Access denied. Insufficient permissions.' 
          });
        }
        return next();
      }

      // Fallback: If route did not explicitly include authenticateToken before this
      await authenticateToken(req, res, () => {
        if (!req.user || (!roles.includes(req.user.role) && req.user.role !== 'super_admin')) {
          return res.status(403).json({ 
            message: 'Access denied. Insufficient permissions.' 
          });
        }
        next();
      });
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

const isAdmin = requireRole(['admin']);
const isStudent = requireRole(['student']);
const isCoordinator = requireRole(['coordinator']); // Issue #17 fix: only coordinators
const isFaculty = requireRole(['faculty']); // Issue #17 fix: only faculty
const isAdminOrCoordinator = requireRole(['admin', 'coordinator']);
const isAdminOrStudent = requireRole(['admin', 'student']);
const isAdminOrFaculty = requireRole(['admin', 'faculty']);
const isSuperAdmin = requireRole(['super_admin']);

module.exports = {
  requireRole,
  isAdmin,
  isStudent,
  isCoordinator,
  isFaculty,
  isAdminOrCoordinator,
  isAdminOrStudent,
  isAdminOrFaculty,
  isSuperAdmin
};
