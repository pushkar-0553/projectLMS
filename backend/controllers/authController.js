const User = require('../models/userModel');
const { generateToken } = require('../utils/token');
const bcrypt = require('bcryptjs');

const authController = {
  async getUser(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      // Issue #2 fix: Force role to 'student' — ignore any role from request body
      const role = 'student';

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password using bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Issue #4 fix: Use object destructuring to match User.create() signature
      const userId = await User.create({ name, email, password: hashedPassword, role });

      const user = await User.findById(userId);
      const token = generateToken(userId, role);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Compare hashed passwords using bcrypt
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user.id, user.role);

      // Issue #1 fix: Strip password from response
      const { password: _pwd, ...safeUser } = user;

      res.json({
        message: 'Login successful',
        token,
        user: safeUser
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = authController;
