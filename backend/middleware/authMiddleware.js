const { verifyToken } = require('../utils/token');
const User = require('../models/userModel');
const { recordAuthDuration } = require('../utils/perfTracker');

// High-Performance In-Memory User Auth Cache (60s TTL)
// Avoids repeated cross-network SQL round trips for high-frequency user/role checks
const userCache = new Map();
const USER_CACHE_TTL_MS = 60 * 1000;

function invalidateUserCache(userId) {
  if (userId) {
    userCache.delete(String(userId));
    userCache.delete(Number(userId));
  } else {
    userCache.clear();
  }
}

// Clean up expired cache entries periodically every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now >= value.expiresAt) {
      userCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

// Issue #3 fix: Re-validate role from DB/cache on every request
// Issue #31 fix: Populate req.user.name for messaging
const protect = async (req, res, next) => {
  const authStart = process.hrtime.bigint();
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    const now = Date.now();
    const cached = userCache.get(decoded.id);

    if (cached && now < cached.expiresAt) {
      req.user = cached.user;
      const authDur = Number(process.hrtime.bigint() - authStart) / 1e6;
      recordAuthDuration(authDur);
      return next();
    }

    // Fetch fresh user data from DB to get current role and name
    const dbUser = await User.findById(decoded.id);
    if (!dbUser) {
      userCache.delete(decoded.id);
      return res.status(401).json({ message: 'User no longer exists' });
    }

    const userData = {
      id: dbUser.id,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email
    };

    userCache.set(decoded.id, {
      user: userData,
      expiresAt: now + USER_CACHE_TTL_MS
    });

    req.user = userData;
    const authDur = Number(process.hrtime.bigint() - authStart) / 1e6;
    recordAuthDuration(authDur);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      // Role is already fresh from DB/cache via protect middleware
      const userRole = req.user?.role;

      if (!userRole || (!roles.includes(userRole) && userRole !== 'super_admin')) {
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
  authenticateToken: protect, // Keep compatibility
  invalidateUserCache
};
