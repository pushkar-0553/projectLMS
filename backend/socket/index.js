const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
  // Issue #7 fix: Restrict Socket.io CORS origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Join a room specific to this user
    socket.join(`user:${socket.user.id}`);

    // Join common rooms based on role if needed
    if (socket.user.role) {
      socket.join(`role:${socket.user.role}`);
    }

    // Issue #29 fix: Join batch rooms so batch announcements work
    try {
      const pool = require('../config/db');
      const [batches] = await pool.execute(
        `SELECT DISTINCT batch_id FROM StudentBatchMap WHERE student_id = ?
         UNION
         SELECT DISTINCT id as batch_id FROM Batches WHERE coordinator_id = ?
         UNION
         SELECT DISTINCT batch_id FROM FacultyBatchMap WHERE faculty_id = ?`,
        [socket.user.id, socket.user.id, socket.user.id]
      );
      
      for (const row of batches) {
        if (row.batch_id) {
          socket.join(`batch:${row.batch_id}`);
        }
      }
    } catch (err) {
      console.error('Error joining batch rooms:', err.message);
    }

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const emitNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('new-notification', notification);
  }
};

module.exports = { initSocket, getIO, emitNotification };
