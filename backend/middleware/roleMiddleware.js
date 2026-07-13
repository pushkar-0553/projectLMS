const { authenticateToken } = require('./authMiddleware');
const User = require('../models/userModel');

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      await authenticateToken(req, res, async () => {
        const user = await User.findById(req.user.id);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (!roles.includes(user.role)) {
          return res.status(403).json({ 
            message: 'Access denied. Insufficient permissions.' 
          });
        }

        req.user = { ...req.user, role: user.role };
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

module.exports = {
  requireRole,
  isAdmin,
  isStudent,
  isCoordinator,
  isFaculty,
  isAdminOrCoordinator,
  isAdminOrStudent,
  isAdminOrFaculty
};
