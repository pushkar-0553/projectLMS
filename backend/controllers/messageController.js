const pool = require('../config/db');
const NotificationModel = require('../models/notificationModel');
const { getIO } = require('../socket');

const messageController = {
  // 1. Send Message / Announcement
  // 1. Send Message / Announcement
  async sendMessage(req, res) {
    try {
      const { receiver_id, batch_id, sub_batch_id, content, is_announcement, attachments, reply_to_id } = req.body;
      const sender_id = req.user.id;

      if (!receiver_id && !batch_id) {
        return res.status(400).json({ error: 'Either receiver_id or batch_id is required' });
      }

      const query = `
        INSERT INTO Messages (sender_id, receiver_id, batch_id, sub_batch_id, content, is_announcement, attachments, reply_to_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')
      `;
      const [result] = await pool.execute(query, [
        sender_id,
        receiver_id || null,
        batch_id || null,
        sub_batch_id || null,
        content,
        is_announcement || false,
        attachments ? JSON.stringify(attachments) : null,
        reply_to_id || null
      ]);

      const io = getIO();
      const newMessage = {
        id: result.insertId,
        sender_id,
        receiver_id: receiver_id || null,
        batch_id: batch_id || null,
        content,
        is_announcement: is_announcement || false,
        attachments: attachments || null,
        reply_to_id: reply_to_id || null,
        status: 'sent',
        reactions: null,
        created_at: new Date(),
        sender_name: req.user.name
      };

      // Real-time broadcasts
      if (receiver_id) {
        io.to(`user:${receiver_id}`).emit('new_message', newMessage);
        io.to(`user:${sender_id}`).emit('new_message', newMessage);
        
        const [unreadRes] = await pool.execute('SELECT COUNT(*) as count FROM Messages WHERE receiver_id = ? AND is_read = FALSE', [receiver_id]);
        io.to(`user:${receiver_id}`).emit('unread_messages_count', { count: unreadRes[0].count });
      } else if (batch_id) {
        io.to(`batch:${batch_id}`).emit('new_message', newMessage); 
      }

      res.status(201).json({ message: 'Message sent successfully', id: result.insertId, data: newMessage });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
  // 2. Get Inbox (Direct Messages + Announcements for User's Batch)
  async getInbox(req, res) {
    try {
      const userId = req.user.id;

      // Premium Inbox Query: Groups by conversation partner and gets the latest message
      let query = `
        SELECT m.*, 
               u.name as sender_name, 
               u.role as sender_role,
               (SELECT COUNT(*) FROM Messages 
                WHERE receiver_id = ? AND sender_id = m.sender_id AND is_read = FALSE) as unread_count
        FROM Messages m
        JOIN (
          SELECT 
            CASE 
              WHEN sender_id = ? THEN receiver_id 
              ELSE sender_id 
            END AS partner_id,
            MAX(created_at) as last_created
          FROM Messages
          WHERE sender_id = ? OR receiver_id = ?
          GROUP BY partner_id
        ) latest ON (
          (m.sender_id = ? AND m.receiver_id = latest.partner_id) OR
          (m.sender_id = latest.partner_id AND m.receiver_id = ?)
        ) AND m.created_at = latest.last_created
        JOIN Users u ON latest.partner_id = u.id
        ORDER BY m.created_at DESC
      `;
      
      const params = [userId, userId, userId, userId, userId, userId];

      const [messages] = await pool.execute(query, params);
      res.json(messages.map(m => ({
        ...m,
        attachments: typeof m.attachments === 'string' ? JSON.parse(m.attachments || 'null') : m.attachments,
        reactions: typeof m.reactions === 'string' ? JSON.parse(m.reactions || 'null') : m.reactions
      })));
    } catch (error) {
      console.error('Get inbox error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },
  // 3. Get Batch Announcements
  async getBatchAnnouncements(req, res) {
    try {
      const { batchId } = req.params;
      const query = `
        SELECT m.*, u.name as sender_name
        FROM Messages m
        JOIN Users u ON m.sender_id = u.id
        WHERE m.batch_id = ? AND m.is_announcement = TRUE
        ORDER BY m.created_at DESC
      `;
      const [messages] = await pool.execute(query, [batchId]);
      res.json(messages.map(m => ({
        ...m,
        attachments: typeof m.attachments === 'string' ? JSON.parse(m.attachments || 'null') : m.attachments,
        reactions: typeof m.reactions === 'string' ? JSON.parse(m.reactions || 'null') : m.reactions
      })));
    } catch (error) {
      console.error('Get batch announcements error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // 4. Get Conversation with Specific User
  async getConversation(req, res) {
    try {
      const { userId } = req.params;
      const myId = req.user.id;
      const myRole = req.user.role;

      // Issue #28 fix: Restrict students from querying/starting conversations with users outside their batch/faculty/coordinator/admin
      if (myRole === 'student') {
        const [relation] = await pool.execute(
          `SELECT 1 FROM Users u WHERE u.id = ? AND u.role = 'admin'
           UNION
           SELECT 1 FROM StudentBatchMap sbm1
           JOIN StudentBatchMap sbm2 ON sbm1.batch_id = sbm2.batch_id
           WHERE sbm1.student_id = ? AND sbm2.student_id = ?
           UNION
           SELECT 1 FROM StudentBatchMap sbm
           JOIN Batches b ON sbm.batch_id = b.id
           WHERE sbm.student_id = ? AND b.coordinator_id = ?
           UNION
           SELECT 1 FROM StudentBatchMap sbm
           JOIN FacultyBatchMap fbm ON sbm.batch_id = fbm.batch_id
           WHERE sbm.student_id = ? AND fbm.faculty_id = ?`,
          [userId, myId, userId, myId, userId, myId, userId]
        );
        if (relation.length === 0 && myId != userId) {
          return res.status(403).json({ error: 'Access denied. You cannot message this user.' });
        }
      }

      const query = `
        SELECT m.*, u.name as sender_name,
               r.content as reply_content, r.attachments as reply_attachments, ru.name as reply_sender_name
        FROM Messages m
        JOIN Users u ON m.sender_id = u.id
        LEFT JOIN Messages r ON m.reply_to_id = r.id
        LEFT JOIN Users ru ON r.sender_id = ru.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) 
           OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
      `;
      const [messages] = await pool.execute(query, [myId, userId, userId, myId]);
      res.json(messages.map(m => ({ 
        ...m, 
        attachments: typeof m.attachments === 'string' ? JSON.parse(m.attachments || 'null') : m.attachments,
        reactions: typeof m.reactions === 'string' ? JSON.parse(m.reactions || 'null') : m.reactions,
        reply_attachments: typeof m.reply_attachments === 'string' ? JSON.parse(m.reply_attachments || 'null') : m.reply_attachments
      })));
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // 7. Pin Message
  async pinMessage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [msg] = await pool.execute('SELECT * FROM Messages WHERE id = ?', [id]);
      if (msg.length === 0) return res.status(404).json({ error: 'Message not found' });

      // Issue #30 fix: Verify user has access to the message
      const message = msg[0];
      let hasAccess = false;
      if (message.sender_id === userId || message.receiver_id === userId) {
        hasAccess = true;
      } else if (message.batch_id) {
        const [batchCheck] = await pool.execute(
          `SELECT 1 FROM StudentBatchMap WHERE student_id = ? AND batch_id = ?
           UNION
           SELECT 1 FROM Batches WHERE coordinator_id = ? AND id = ?
           UNION
           SELECT 1 FROM FacultyBatchMap WHERE faculty_id = ? AND batch_id = ?`,
          [userId, message.batch_id, userId, message.batch_id, userId, message.batch_id]
        );
        if (batchCheck.length > 0) hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You cannot pin this message.' });
      }

      await pool.execute(
        'UPDATE Messages SET is_pinned = TRUE, pinned_by = ? WHERE id = ?',
        [userId, id]
      );

      const io = getIO();
      const targetRoom = message.batch_id ? `batch:${message.batch_id}` : `user:${message.receiver_id === userId ? message.sender_id : message.receiver_id}`;
      
      io.to(targetRoom).emit('message-pinned', { id, pinned_by: userId });
      io.to(`user:${userId}`).emit('message-pinned', { id, pinned_by: userId });

      res.json({ message: 'Message pinned successfully' });
    } catch (error) {
      console.error('Pin message error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // 8. Unpin Message
  async unpinMessage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [msg] = await pool.execute('SELECT * FROM Messages WHERE id = ?', [id]);
      if (msg.length === 0) return res.status(404).json({ error: 'Message not found' });

      // Issue #30 fix: Verify user has access to the message
      const message = msg[0];
      let hasAccess = false;
      if (message.sender_id === userId || message.receiver_id === userId) {
        hasAccess = true;
      } else if (message.batch_id) {
        const [batchCheck] = await pool.execute(
          `SELECT 1 FROM StudentBatchMap WHERE student_id = ? AND batch_id = ?
           UNION
           SELECT 1 FROM Batches WHERE coordinator_id = ? AND id = ?
           UNION
           SELECT 1 FROM FacultyBatchMap WHERE faculty_id = ? AND batch_id = ?`,
          [userId, message.batch_id, userId, message.batch_id, userId, message.batch_id]
        );
        if (batchCheck.length > 0) hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You cannot unpin this message.' });
      }

      await pool.execute('UPDATE Messages SET is_pinned = FALSE, pinned_by = NULL WHERE id = ?', [id]);

      const io = getIO();
      const targetRoom = message.batch_id ? `batch:${message.batch_id}` : `user:${message.receiver_id === userId ? message.sender_id : message.receiver_id}`;

      io.to(targetRoom).emit('message-unpinned', { id });
      io.to(`user:${userId}`).emit('message-unpinned', { id });

      res.json({ message: 'Message unpinned successfully' });
    } catch (error) {
      console.error('Unpin message error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // 9. Get Pinned Messages
  async getPinnedMessages(req, res) {
    try {
      const { type, id } = req.query; // type: 'direct' or 'batch', id: target userId or batchId
      const myId = req.user.id;

      let query = '';
      let params = [];

      if (type === 'direct') {
        query = `
          SELECT m.*, u.name as pinned_by_name
          FROM Messages m
          LEFT JOIN Users u ON m.pinned_by = u.id
          WHERE is_pinned = TRUE AND (
            (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
          )
        `;
        params = [myId, id, id, myId];
      } else {
        query = `
          SELECT m.*, u.name as pinned_by_name
          FROM Messages m
          LEFT JOIN Users u ON m.pinned_by = u.id
          WHERE is_pinned = TRUE AND m.batch_id = ?
        `;
        params = [id];
      }

      const [pins] = await pool.execute(query, params);
      res.json(pins.map(p => ({ 
        ...p, 
        attachments: typeof p.attachments === 'string' ? JSON.parse(p.attachments || 'null') : p.attachments,
        reactions: typeof p.reactions === 'string' ? JSON.parse(p.reactions || 'null') : p.reactions
      })));
    } catch (error) {
      console.error('Get pinned messages error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // 5. Get Unread Message Count
  async getUnreadCount(req, res) {
    try {
      const myId = req.user.id;
      const [result] = await pool.execute(
        'SELECT COUNT(*) as count FROM Messages WHERE receiver_id = ? AND is_read = FALSE',
        [myId]
      );
      res.json({ unreadCount: result[0].count });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // 6. Mark Conversation Read
  async markAsRead(req, res) {
    try {
      const { senderId } = req.params;
      const myId = req.user.id;

      await pool.execute(
        "UPDATE Messages SET is_read = TRUE, status = 'read' WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE",
        [senderId, myId]
      );
      
      const io = getIO();
      // Notify sender that their messages were read
      io.to(`user:${senderId}`).emit('messages_read', { byUser: myId, fromUser: senderId });

      // Emit new unread count
      const [unreadRes] = await pool.execute(
        'SELECT COUNT(*) as count FROM Messages WHERE receiver_id = ? AND is_read = FALSE',
        [myId]
      );
      io.to(`user:${myId}`).emit('unread_messages_count', { count: unreadRes[0].count });

      res.json({ message: 'Messages marked as read' });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // 10. Toggle Reaction
  async toggleReaction(req, res) {
    try {
      const { id } = req.params;
      const { emoji } = req.body;
      const userId = req.user.id;
      const userName = req.user.name;

      const [msg] = await pool.execute('SELECT reactions, receiver_id, batch_id, sender_id FROM Messages WHERE id = ?', [id]);
      if (msg.length === 0) return res.status(404).json({ error: 'Message not found' });

      // Issue #30 fix: Verify user has access to the message
      const message = msg[0];
      let hasAccess = false;
      if (message.sender_id === userId || message.receiver_id === userId) {
        hasAccess = true;
      } else if (message.batch_id) {
        const [batchCheck] = await pool.execute(
          `SELECT 1 FROM StudentBatchMap WHERE student_id = ? AND batch_id = ?
           UNION
           SELECT 1 FROM Batches WHERE coordinator_id = ? AND id = ?
           UNION
           SELECT 1 FROM FacultyBatchMap WHERE faculty_id = ? AND batch_id = ?`,
          [userId, message.batch_id, userId, message.batch_id, userId, message.batch_id]
        );
        if (batchCheck.length > 0) hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied. You cannot react to this message.' });
      }

      let reactions = Object.keys(message.reactions || {}).length ? message.reactions : {};
      // Ensure reactions is an object
      if (typeof reactions === 'string') reactions = JSON.parse(reactions);

      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      const userIndex = reactions[emoji].findIndex(user => user.userId === userId);
      
      if (userIndex > -1) {
        reactions[emoji].splice(userIndex, 1);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji].push({ userId, userName });
      }

      await pool.execute('UPDATE Messages SET reactions = ? WHERE id = ?', [JSON.stringify(reactions), id]);

      const io = getIO();
      const targetRoom = message.batch_id ? `batch:${message.batch_id}` : `user:${message.receiver_id === userId ? message.sender_id : message.receiver_id}`;
      
      io.to(targetRoom).emit('message-reaction', { messageId: id, reactions });
      io.to(`user:${userId}`).emit('message-reaction', { messageId: id, reactions });
      if (message.receiver_id && message.receiver_id !== userId) {
         io.to(`user:${message.receiver_id}`).emit('message-reaction', { messageId: id, reactions });
      }

      res.json({ message: 'Reaction toggled', reactions });
    } catch (error) {
      console.error('Toggle reaction error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
};

module.exports = messageController;
