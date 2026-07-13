const User = require('../models/userModel');
const Batch = require('../models/batchModel');
const Activity = require('../models/activityModel');
const { logActivity } = require('../utils/auditLogger');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, mobile } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const userId = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      mobile
    });
    
    // Log activity
    await logActivity(
      req.user.id,
      req.user.role || 'admin',
      'CREATE_USER',
      'user',
      userId,
      `Created new ${role}: ${name} (${email})`
    );
    
    res.status(201).json({ message: 'User created successfully', userId });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { name, classLink } = req.body;
    const batchId = await Batch.create(name, classLink);
    
    // Log activity
    await logActivity(
      req.user.id,
      req.user.role || 'admin',
      'CREATE_BATCH',
      'batch',
      batchId,
      `Created main batch: ${name}`
    );
    
    res.status(201).json({ message: 'Batch created successfully', batchId });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBatchClassLink = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { classLink } = req.body;

    const updated = await Batch.updateClassLink(batchId, classLink);
    if (!updated) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    await logActivity(
      req.user.id,
      'admin',
      'UPDATE_CLASS_LINK',
      'batch',
      Number(batchId),
      `Updated class link for batch ID: ${batchId}`
    );

    res.json({ message: 'Class link updated successfully' });
  } catch (error) {
    console.error('Error updating class link:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const batches = await Batch.getBatchHierarchy();
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCoordinators = async (req, res) => {
  try {
    const coordinators = await User.findByRole('coordinator');
    res.json(coordinators);
  } catch (error) {
    console.error('Error fetching coordinators:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getFaculties = async (req, res) => {
  try {
    const faculties = await User.findByRole('faculty');
    res.json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await User.findByRole('student');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await Activity.getAll();
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Issue #8 fix: Add delete user handler
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.delete(id);

    await logActivity(
      req.user.id,
      'admin',
      'DELETE_USER',
      'user',
      parseInt(id),
      `Deleted ${user.role}: ${user.name} (${user.email})`
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
