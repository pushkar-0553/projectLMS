// Real-time Socket.IO Service
// Student Execution & Mentorship Platform

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket.id
    this.userSockets = new Map(); // socket.id -> userId
    this.activeSessions = new Map(); // sessionId -> Set of user IDs
  }

  initialize(server) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://project-lms-six.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean).map(origin => origin.replace(/\/$/, ''));

    this.io = socketIo(server, {
      cors: {
        origin: function (origin, callback) {
          if (!origin) return callback(null, true);
          const normalizedOrigin = origin.replace(/\/$/, '');
          if (allowedOrigins.includes(normalizedOrigin) || /^https:\/\/project-lms.*\.vercel\.app$/.test(normalizedOrigin)) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        },
        methods: ["GET", "POST"]
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Verify user is active
        const [users] = await db.execute(
          'SELECT id, username, role, is_active FROM Users WHERE id = ?',
          [decoded.userId]
        );
        
        if (users.length === 0 || !users[0].is_active) {
          return next(new Error('User not found or inactive'));
        }

        socket.userId = users[0].id;
        socket.userRole = users[0].role;
        socket.username = users[0].username;
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('Socket.IO server initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;
    const userRole = socket.userRole;
    const username = socket.username;

    console.log(`User connected: ${username} (${userRole}) - Socket: ${socket.id}`);

    // Track connected user
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);

    // Join user to their role room
    socket.join(`role:${userRole}`);
    
    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Join student to their batch rooms
    if (userRole === 'student') {
      this.joinUserToBatches(socket, userId);
    }

    // Join coordinator to their batch rooms
    if (userRole === 'coordinator') {
      this.joinCoordinatorToBatches(socket, userId);
    }

    // Send initial data
    this.sendInitialData(socket);

    // Handle events
    socket.on('join-session', (data) => this.handleJoinSession(socket, data));
    socket.on('leave-session', (data) => this.handleLeaveSession(socket, data));
    socket.on('session-action', (data) => this.handleSessionAction(socket, data));
    socket.on('project-update', (data) => this.handleProjectUpdate(socket, data));
    socket.on('batch-activity', (data) => this.handleBatchActivity(socket, data));
    socket.on('notification-read', (data) => this.handleNotificationRead(socket, data));
    socket.on('typing', (data) => this.handleTyping(socket, data));

    socket.on('disconnect', () => this.handleDisconnection(socket));
  }

  async joinUserToBatches(socket, userId) {
    try {
      const [batches] = await db.execute(
        'SELECT batch_id FROM StudentBatches WHERE student_id = ? AND status = "active"',
        [userId]
      );

      for (const batch of batches) {
        socket.join(`batch:${batch.batch_id}`);
      }
    } catch (error) {
      console.error('Error joining user to batches:', error);
    }
  }

  async joinCoordinatorToBatches(socket, userId) {
    try {
      const [batches] = await db.execute(
        'SELECT id FROM Batches WHERE coordinator_id = ? AND status = "active"',
        [userId]
      );

      for (const batch of batches) {
        socket.join(`batch:${batch.id}`);
      }
    } catch (error) {
      console.error('Error joining coordinator to batches:', error);
    }
  }

  async sendInitialData(socket) {
    try {
      const userId = socket.userId;
      const userRole = socket.userRole;

      // Send unread notifications
      const [notifications] = await db.execute(
        'SELECT * FROM Notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC LIMIT 10',
        [userId]
      );

      socket.emit('notifications', notifications);

      // Send active sessions based on role
      if (['admin', 'coordinator', 'faculty'].includes(userRole)) {
        const [sessions] = await db.execute(
          'SELECT * FROM LiveSessions WHERE session_status IN ("scheduled", "live") ORDER BY scheduled_start ASC LIMIT 10'
        );
        socket.emit('active-sessions', sessions);
      }

      // Send student's upcoming sessions
      if (userRole === 'student') {
        const [sessions] = await db.execute(`
          SELECT ls.* FROM LiveSessions ls
          JOIN StudentBatches sb ON ls.batch_id = sb.batch_id
          WHERE sb.student_id = ? AND sb.status = "active" 
          AND ls.session_status IN ("scheduled", "live")
          AND ls.scheduled_start >= NOW()
          ORDER BY ls.scheduled_start ASC LIMIT 5
        `, [userId]);
        
        socket.emit('upcoming-sessions', sessions);
      }

      // Send online users count
      socket.emit('online-users', {
        total: this.connectedUsers.size,
        byRole: this.getOnlineUsersByRole()
      });

    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  handleJoinSession(socket, data) {
    const { sessionId } = data;
    const userId = socket.userId;

    socket.join(`session:${sessionId}`);
    
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, new Set());
    }
    this.activeSessions.get(sessionId).add(userId);

    // Notify others in session
    socket.to(`session:${sessionId}`).emit('user-joined-session', {
      userId,
      username: socket.username,
      timestamp: new Date()
    });

    // Update session participant count
    this.updateSessionParticipantCount(sessionId);
  }

  handleLeaveSession(socket, data) {
    const { sessionId } = data;
    const userId = socket.userId;

    socket.leave(`session:${sessionId}`);
    
    if (this.activeSessions.has(sessionId)) {
      this.activeSessions.get(sessionId).delete(userId);
      if (this.activeSessions.get(sessionId).size === 0) {
        this.activeSessions.delete(sessionId);
      }
    }

    // Notify others in session
    socket.to(`session:${sessionId}`).emit('user-left-session', {
      userId,
      username: socket.username,
      timestamp: new Date()
    });

    this.updateSessionParticipantCount(sessionId);
  }

  handleSessionAction(socket, data) {
    const { sessionId, action, payload } = data;
    const userId = socket.userId;
    const userRole = socket.userRole;

    // Verify permissions for session actions
    this.verifySessionActionPermission(userId, userRole, sessionId, action)
      .then(hasPermission => {
        if (!hasPermission) {
          socket.emit('error', { message: 'Permission denied for session action' });
          return;
        }

        // Broadcast action to session participants
        this.io.to(`session:${sessionId}`).emit('session-action', {
          sessionId,
          action,
          payload,
          userId,
          username: socket.username,
          timestamp: new Date()
        });

        // Handle specific actions
        if (action === 'start') {
          this.handleSessionStart(sessionId, userId);
        } else if (action === 'end') {
          this.handleSessionEnd(sessionId, userId);
        } else if (action === 'screen-share') {
          this.handleScreenShare(sessionId, userId, payload);
        }
      })
      .catch(error => {
        console.error('Error verifying session action permission:', error);
        socket.emit('error', { message: 'Error verifying permissions' });
      });
  }

  handleProjectUpdate(socket, data) {
    const { projectId, update, studentId } = data;
    const userId = socket.userId;
    const userRole = socket.userRole;

    // Notify relevant users about project update
    const recipients = [`user:${studentId}`];
    
    // Add coordinator if student
    if (userRole === 'student') {
      this.getStudentCoordinatorId(studentId).then(coordinatorId => {
        if (coordinatorId) {
          recipients.push(`user:${coordinatorId}`);
        }
        this.io.to(recipients).emit('project-update', {
          projectId,
          update,
          updatedBy: userId,
          timestamp: new Date()
        });
      });
    } else {
      // If coordinator/faculty updating, notify student
      this.io.to(recipients).emit('project-update', {
        projectId,
        update,
        updatedBy: userId,
        timestamp: new Date()
      });
    }
  }

  handleBatchActivity(socket, data) {
    const { batchId, activity, type } = data;
    const userId = socket.userId;

    // Broadcast to batch members
    this.io.to(`batch:${batchId}`).emit('batch-activity', {
      batchId,
      activity,
      type,
      userId,
      username: socket.username,
      timestamp: new Date()
    });
  }

  handleNotificationRead(socket, data) {
    const { notificationId } = data;
    const userId = socket.userId;

    // Update database
    db.execute('UPDATE Notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [notificationId, userId])
      .then(() => {
        // Update unread count for user
        this.getUnreadNotificationCount(userId).then(count => {
          socket.emit('notification-count', count);
        });
      })
      .catch(error => {
        console.error('Error marking notification as read:', error);
      });
  }

  handleTyping(socket, data) {
    const { sessionId, isTyping } = data;
    const userId = socket.userId;

    socket.to(`session:${sessionId}`).emit('user-typing', {
      userId,
      username: socket.username,
      isTyping,
      timestamp: new Date()
    });
  }

  handleDisconnection(socket) {
    const userId = socket.userId;
    const username = socket.username;

    console.log(`User disconnected: ${username} - Socket: ${socket.id}`);

    // Remove from tracking
    this.connectedUsers.delete(userId);
    this.userSockets.delete(socket.id);

    // Remove from all active sessions
    for (const [sessionId, participants] of this.activeSessions.entries()) {
      if (participants.has(userId)) {
        participants.delete(userId);
        
        // Notify others in session
        socket.to(`session:${sessionId}`).emit('user-left-session', {
          userId,
          username: socket.username,
          timestamp: new Date()
        });
        
        this.updateSessionParticipantCount(sessionId);
      }
    }

    // Broadcast updated online count
    this.io.emit('online-users', {
      total: this.connectedUsers.size,
      byRole: this.getOnlineUsersByRole()
    });
  }

  // Helper methods
  getOnlineUsersByRole() {
    const roleCounts = {};
    
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.userRole) {
        roleCounts[socket.userRole] = (roleCounts[socket.userRole] || 0) + 1;
      }
    }
    
    return roleCounts;
  }

  async updateSessionParticipantCount(sessionId) {
    try {
      const count = this.activeSessions.get(sessionId)?.size || 0;
      
      // Update database
      await db.execute(
        'UPDATE LiveSessions SET current_participants = ? WHERE id = ?',
        [count, sessionId]
      );

      // Broadcast updated count
      this.io.emit('session-participant-count', {
        sessionId,
        count,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating session participant count:', error);
    }
  }

  async verifySessionActionPermission(userId, userRole, sessionId, action) {
    try {
      const [sessions] = await db.execute(
        'SELECT * FROM LiveSessions WHERE id = ?',
        [sessionId]
      );

      if (sessions.length === 0) return false;

      const session = sessions[0];

      // Admins can do anything
      if (userRole === 'admin') return true;

      // Host can control their own sessions
      if (session.host_id === userId) return true;

      // Coordinators can control sessions for their batches
      if (userRole === 'coordinator' && session.batch_id) {
        const [batch] = await db.execute(
          'SELECT id FROM Batches WHERE id = ? AND coordinator_id = ?',
          [session.batch_id, userId]
        );
        return batch.length > 0;
      }

      // Students can only perform limited actions
      if (userRole === 'student') {
        return ['join', 'leave', 'raise-hand'].includes(action);
      }

      return false;
    } catch (error) {
      console.error('Error verifying session action permission:', error);
      return false;
    }
  }

  async handleSessionStart(sessionId, hostId) {
    try {
      await db.execute(
        'UPDATE LiveSessions SET session_status = "live", actual_start = CURRENT_TIMESTAMP WHERE id = ?',
        [sessionId]
      );

      // Notify all relevant users
      this.io.emit('session-started', {
        sessionId,
        hostId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling session start:', error);
    }
  }

  async handleSessionEnd(sessionId, hostId) {
    try {
      await db.execute(
        'UPDATE LiveSessions SET session_status = "ended", actual_end = CURRENT_TIMESTAMP WHERE id = ?',
        [sessionId]
      );

      // Clear session participants
      this.activeSessions.delete(sessionId);

      // Notify all relevant users
      this.io.emit('session-ended', {
        sessionId,
        hostId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error handling session end:', error);
    }
  }

  async getStudentCoordinatorId(studentId) {
    try {
      const [result] = await db.execute(`
        SELECT b.coordinator_id 
        FROM StudentBatches sb 
        JOIN Batches b ON sb.batch_id = b.id 
        WHERE sb.student_id = ? AND sb.status = "active"
        LIMIT 1
      `, [studentId]);

      return result.length > 0 ? result[0].coordinator_id : null;
    } catch (error) {
      console.error('Error getting student coordinator:', error);
      return null;
    }
  }

  async getUnreadNotificationCount(userId) {
    try {
      const [result] = await db.execute(
        'SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );
      return result[0].count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Public methods for external use
  notifyUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  notifyRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  notifyBatch(batchId, event, data) {
    this.io.to(`batch:${batchId}`).emit(event, data);
  }

  notifySession(sessionId, event, data) {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  getOnlineCount() {
    return this.connectedUsers.size;
  }

  getSessionParticipants(sessionId) {
    return Array.from(this.activeSessions.get(sessionId) || []);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = new SocketService();
