const { verifyToken } = require('../utils/token');
const User = require('../models/userModel');

// Issue #3 fix: Re-validate role from DB on every request
// Issue #31 fix: Populate req.user.name for messaging
const protect = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    
    // Fetch fresh user data from DB to get current role and name
    const dbUser = await User.findById(decoded.id);
    if (!dbUser) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // Overwrite token data with fresh DB data
    req.user = {
      id: dbUser.id,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      // Role is already fresh from DB via protect middleware
      const userRole = req.user.role;

      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({ 
          message: `Role ${userRole} is not authorized to access this route` 
        });
      }
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = { 
  protect, 
  authorize,
  authenticateToken: protect // Keep compatibility
};
