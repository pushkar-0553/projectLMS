const User = require('../models/userModel')
const bcrypt = require('bcryptjs')
const pool = require('../config/db')

const userController = {
  // Get all students (for admin)
  async getAllStudents(req, res) {
    try {
      const students = await User.findByRole('student')
      res.json(students)
    } catch (error) {
      console.error('Get all students error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Create student (admin only)
  async createStudent(req, res) {
    try {
      const { name, email, mobile, batch, password } = req.body

      // Check if email already exists
      const existingUser = await User.findByEmail(email)
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password || 'student123', 10)

      // Create user with additional fields
      const userId = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'student',
        mobile,
        batch
      })

      res.status(201).json({
        message: 'Student created successfully',
        user: {
          id: userId,
          name,
          email,
          mobile,
          batch,
          role: 'student'
        }
      })
    } catch (error) {
      console.error('Create student error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Delete student (admin only)
  async deleteStudent(req, res) {
    try {
      const { id } = req.params
      await User.delete(id)
      res.json({ message: 'Student deleted successfully' })
    } catch (error) {
      console.error('Delete student error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id)
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }
      res.json(user)
    } catch (error) {
      console.error('Get profile error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { name, mobile, batch } = req.body
      await User.update(req.user.id, { name, mobile, batch })
      res.json({ message: 'Profile updated successfully' })
    } catch (error) {
      console.error('Update profile error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = req.user.id

      // Get user with password
      const user = await User.findByIdWithPassword(userId)
      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password)
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' })
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password
      await User.updatePassword(userId, hashedPassword)

      res.json({ message: 'Password changed successfully' })
    } catch (error) {
      console.error('Change password error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Create coordinator (admin only)
  async createCoordinator(req, res) {
    try {
      const { name, email, mobile, batch, password } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      // Check if coordinator already exists
      const existingCoordinator = await User.findByEmail(email);
      if (existingCoordinator) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Hash password (default: coordinator123)
      const hashedPassword = await bcrypt.hash(password || 'coordinator123', 10);

      // Create coordinator using object-based create method
      const coordinatorId = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'coordinator',
        mobile: mobile || null,
        batch: batch || null
      });

      res.status(201).json({
        message: 'Coordinator created successfully',
        coordinator: {
          id: coordinatorId,
          name,
          email,
          mobile,
          batch,
          role: 'coordinator'
        }
      });
    } catch (error) {
      console.error('Create coordinator error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get all coordinators (admin only)
  async getAllCoordinators(req, res) {
    try {
      const coordinators = await User.findByRole('coordinator');
      res.json(coordinators);
    } catch (error) {
      console.error('Get coordinators error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete coordinator (admin only)
  async deleteCoordinator(req, res) {
    try {
      const { id } = req.params;
      await User.delete(id);
      res.json({ message: 'Coordinator deleted successfully' });
    } catch (error) {
      console.error('Delete coordinator error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Bulk create students (admin only)
  async bulkCreateStudents(req, res) {
    try {
      const { students } = req.body; // Expects array of { name, email, mobile, batch, password }
      
      if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: 'No student data provided' });
      }

      // Check for existing emails
      const emails = students.map(s => s.email);
      const [existingUsers] = await pool.query('SELECT email FROM Users WHERE email IN (?)', [emails]);
      const existingEmails = existingUsers.map(u => u.email);

      // Filter out students that already exist
      const newStudentsData = students.filter(s => !existingEmails.includes(s.email));

      if (newStudentsData.length === 0) {
        return res.status(400).json({ 
          message: 'All students in the list already exist',
          existingCount: existingEmails.length
        });
      }

      // Prepare data for bulk insert
      const hashedStudents = await Promise.all(newStudentsData.map(async (s) => {
        const hashedPassword = await bcrypt.hash(s.password || 'student123', 10);
        return {
          ...s,
          password: hashedPassword,
          role: 'student'
        };
      }));

      const insertedCount = await User.bulkCreate(hashedStudents);

      res.status(201).json({
        message: `Successfully imported ${insertedCount} students`,
        skippedCount: existingEmails.length,
        totalCount: students.length
      });
    } catch (error) {
      console.error('Bulk create students error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = userController
