// Role-based Access Control Middleware
// Student Execution & Mentorship Platform

const roleMiddleware = {
  // Check if user has required role
  requireRole: (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `Required roles: ${allowedRoles.join(', ')}, Current role: ${req.user.role}`
        });
      }

      next();
    };
  },

  // Check if user can access their own data
  requireOwnership: (resourceIdParam = 'id', allowedRoles = ['admin']) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const resourceId = parseInt(req.params[resourceIdParam]);
      
      // Admins and coordinators can access all data
      if (allowedRoles.includes(req.user.role)) {
        return next();
      }

      // Users can only access their own data
      if (req.user.id !== resourceId) {
        return res.status(403).json({ error: 'Access denied - can only access own data' });
      }

      next();
    };
  },

  // Check batch access permissions
  requireBatchAccess: (batchIdParam = 'batchId') => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const batchId = req.params[batchIdParam];
      
      try {
        const db = require('../config/db');
        
        // Admins can access all batches
        if (req.user.role === 'admin') {
          return next();
        }

        // Coordinators can only access their own batches
        if (req.user.role === 'coordinator') {
          const [batches] = await db.execute(
            'SELECT id FROM Batches WHERE id = ? AND coordinator_id = ?',
            [batchId, req.user.id]
          );
          
          if (batches.length === 0) {
            return res.status(403).json({ error: 'Access denied - not your batch' });
          }
          
          return next();
        }

        // Students can only access their own batches
        if (req.user.role === 'student') {
          const [enrollments] = await db.execute(
            'SELECT id FROM StudentBatches WHERE batch_id = ? AND student_id = ? AND status = "active"',
            [batchId, req.user.id]
          );
          
          if (enrollments.length === 0) {
            return res.status(403).json({ error: 'Access denied - not enrolled in this batch' });
          }
          
          return next();
        }

        // Faculty need explicit batch assignment or session hosting
        if (req.user.role === 'faculty') {
          // Check if faculty is hosting a session for this batch
          const [sessions] = await db.execute(
            'SELECT id FROM LiveSessions WHERE batch_id = ? AND host_id = ?',
            [batchId, req.user.id]
          );
          
          if (sessions.length > 0) {
            return next();
          }
          
          return res.status(403).json({ error: 'Access denied - no assignment to this batch' });
        }

        res.status(403).json({ error: 'Access denied' });
      } catch (error) {
        console.error('Batch access check error:', error);
        res.status(500).json({ error: 'Failed to verify batch access' });
      }
    };
  },

  // Check session access permissions
  requireSessionAccess: (sessionIdParam = 'id', requireHost = false) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const sessionId = req.params[sessionIdParam];
      
      try {
        const db = require('../config/db');
        
        // Get session details
        const [sessions] = await db.execute(
          'SELECT * FROM LiveSessions WHERE id = ?',
          [sessionId]
        );
        
        if (sessions.length === 0) {
          return res.status(404).json({ error: 'Session not found' });
        }
        
        const session = sessions[0];

        // Admins can access all sessions
        if (req.user.role === 'admin') {
          req.session = session;
          return next();
        }

        // Check if user is the host
        if (session.host_id === req.user.id) {
          req.session = session;
          return next();
        }

        // If host is required, deny access
        if (requireHost) {
          return res.status(403).json({ error: 'Access denied - must be session host' });
        }

        // Coordinators can access sessions for their batches
        if (req.user.role === 'coordinator') {
          if (session.batch_id) {
            const [batch] = await db.execute(
              'SELECT id FROM Batches WHERE id = ? AND coordinator_id = ?',
              [session.batch_id, req.user.id]
            );
            
            if (batch.length > 0) {
              req.session = session;
              return next();
            }
          }
        }

        // Students can only join sessions for their batches
        if (req.user.role === 'student') {
          if (session.batch_id) {
            const [enrollment] = await db.execute(
              'SELECT id FROM StudentBatches WHERE batch_id = ? AND student_id = ? AND status = "active"',
              [session.batch_id, req.user.id]
            );
            
            if (enrollment.length > 0) {
              req.session = session;
              return next();
            }
          }
        }

        // Faculty can access sessions they're hosting or for batches they're assigned to
        if (req.user.role === 'faculty') {
          // Already checked if they're host above
          // Could add additional logic for batch assignments here
        }

        res.status(403).json({ error: 'Access denied to this session' });
      } catch (error) {
        console.error('Session access check error:', error);
        res.status(500).json({ error: 'Failed to verify session access' });
      }
    };
  },

  // Check project access permissions
  requireProjectAccess: (projectIdParam = 'id') => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const projectId = req.params[projectIdParam];
      
      try {
        const db = require('../config/db');
        
        // Admins and coordinators can access all projects
        if (['admin', 'coordinator'].includes(req.user.role)) {
          return next();
        }

        // Students can only access their assigned projects
        if (req.user.role === 'student') {
          const [assignments] = await db.execute(
            'SELECT id FROM StudentProjects WHERE student_id = ? AND project_id = ?',
            [req.user.id, projectId]
          );
          
          if (assignments.length === 0) {
            return res.status(403).json({ error: 'Access denied - project not assigned to you' });
          }
          
          return next();
        }

        // Faculty can access projects for their assigned batches/sessions
        if (req.user.role === 'faculty') {
          // Could add logic to check batch assignments
          return next();
        }

        res.status(403).json({ error: 'Access denied' });
      } catch (error) {
        console.error('Project access check error:', error);
        res.status(500).json({ error: 'Failed to verify project access' });
      }
    };
  },

  // Rate limiting middleware
  rateLimit: (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const key = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(key)) {
        requests.set(key, []);
      }
      
      const userRequests = requests.get(key);
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
      requests.set(key, validRequests);
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({ 
          error: 'Too many requests',
          message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 60000} minutes.`
        });
      }
      
      // Add current request
      validRequests.push(now);
      
      next();
    };
  },

  // Check if user is active
  requireActive: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.is_active) {
      return res.status(403).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact administrator.'
      });
    }

    next();
  },

  // Validate required fields
  validateRequired: (fields) => {
    return (req, res, next) => {
      const missing = fields.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          missing: missing
        });
      }

      next();
    };
  },

  // Check if user can perform action on entity
  canPerformAction: (action, entityType) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const permissions = {
        admin: {
          can: ['create', 'read', 'update', 'delete'],
          entities: ['user', 'batch', 'project', 'session', 'notification', 'setting']
        },
        coordinator: {
          can: ['create', 'read', 'update'],
          entities: ['batch', 'project', 'session', 'student']
        },
        faculty: {
          can: ['create', 'read', 'update'],
          entities: ['session', 'evaluation', 'student']
        },
        student: {
          can: ['read', 'update'],
          entities: ['profile', 'project', 'session']
        }
      };

      const userPermissions = permissions[req.user.role];
      
      if (!userPermissions) {
        return res.status(403).json({ error: 'Invalid role' });
      }

      if (!userPermissions.can.includes(action)) {
        return res.status(403).json({ 
          error: 'Action not permitted',
          message: `Role ${req.user.role} cannot perform ${action} on ${entityType}`
        });
      }

      if (!userPermissions.entities.includes(entityType)) {
        return res.status(403).json({ 
          error: 'Entity access not permitted',
          message: `Role ${req.user.role} cannot access ${entityType}`
        });
      }

      next();
    };
  }
};

module.exports = roleMiddleware;
