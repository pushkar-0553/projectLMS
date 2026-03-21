const Project = require('../models/projectModel');
const Step = require('../models/stepModel');
const Progress = require('../models/progressModel');
const pool = require('../config/db');

const projectController = {
  async getAllProjects(req, res) {
    try {
      const projects = await Project.getAll();
      res.json(projects);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async createProject(req, res) {
    try {
      const { 
        title, 
        level, 
        description, 
        trainer, 
        duration, 
        difficulty = 'Medium',
        estimatedTime = 60,
        orderIndex = 0,
        prerequisites,
        type = 'main',
        steps 
      } = req.body;

      if (!title || !level || !description) {
        return res.status(400).json({ 
          message: 'Title, level, and description are required' 
        });
      }

      // Handle files
      let thumbnailPath = null;
      const stepImagesMap = {};

      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          if (file.fieldname === 'thumbnail') {
            thumbnailPath = `/uploads/projects/${file.filename}`;
          } else if (file.fieldname.startsWith('step_images_')) {
            const stepIndex = parseInt(file.fieldname.split('_').pop(), 10);
            if (!isNaN(stepIndex)) {
              if (!stepImagesMap[stepIndex]) stepImagesMap[stepIndex] = [];
              stepImagesMap[stepIndex].push(`/uploads/projects/${file.filename}`);
            }
          }
        }
      }

      // Parse prerequisites
      let parsedPrerequisites = null;
      if (prerequisites) {
        try {
          parsedPrerequisites = Array.isArray(prerequisites) ? prerequisites : JSON.parse(prerequisites);
        } catch (e) {
          console.error('Error parsing prerequisites:', e);
        }
      }

      // Create the project
      const projectId = await Project.create({ 
        title, 
        description, 
        level, 
        difficulty,
        estimatedTime,
        orderIndex,
        prerequisites: parsedPrerequisites,
        type
      });

      // Update thumbnail if uploaded
      if (thumbnailPath) {
        await pool.execute(
          'UPDATE Projects SET thumbnail = ?, trainer = ?, duration = ? WHERE id = ?',
          [thumbnailPath, trainer || null, duration || null, projectId]
        );
      } else {
        await pool.execute(
          'UPDATE Projects SET trainer = ?, duration = ? WHERE id = ?',
          [trainer || null, duration || null, projectId]
        );
      }

      // Create steps if provided
      let parsedSteps = steps;
      if (typeof steps === 'string') {
        try { parsedSteps = JSON.parse(steps); } catch(e) { parsedSteps = null; }
      }

      if (parsedSteps && Array.isArray(parsedSteps) && parsedSteps.length > 0) {
        for (let i = 0; i < parsedSteps.length; i++) {
          const step = parsedSteps[i];
          const stepImages = stepImagesMap[i] || null;
          await Step.create(
            projectId,
            step.title,
            step.explanation,
            step.codeSnippet || step.code_snippet || null,
            step.stepOrder || step.step_order || (i + 1),
            step.expectedOutput || step.expected_output || null,
            step.hints || null,
            stepImages
          );
        }
      }

      // Get complete project data
      const project = await Project.getById(projectId);
      const projectSteps = await Step.getByProjectId(projectId);

      res.status(201).json({
        message: 'Project created successfully',
        project: { ...project, steps: projectSteps }
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ 
        message: 'Server error',
        error: error.message 
      });
    }
  },

  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const { title, level, description, trainer, duration, thumbnail, type, difficulty, estimatedTime, orderIndex, prerequisites } = req.body;

      // Handle thumbnail file upload
      let thumbnailPath = thumbnail;
      if (req.file) {
        thumbnailPath = `/uploads/projects/${req.file.filename}`;
      }

      const [result] = await pool.execute(
        'UPDATE Projects SET title = ?, level = ?, description = ?, trainer = ?, duration = ?, thumbnail = ?, type = ?, difficulty = ?, estimated_time = ?, order_index = ?, prerequisites = ? WHERE id = ?',
        [title, level, description, trainer, duration, thumbnailPath, type || 'main', difficulty || 'Medium', estimatedTime || 60, orderIndex || 0, prerequisites ? JSON.stringify(prerequisites) : null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const project = await Project.getById(id);
      res.json({
        message: 'Project updated successfully',
        project
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async deleteProject(req, res) {
    try {
      const { id } = req.params;

      const [result] = await pool.execute(
        'DELETE FROM Projects WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async createStep(req, res) {
    try {
      const { projectId } = req.params;
      const { title, explanation, codeSnippet, stepOrder } = req.body;

      if (!title || !explanation || !stepOrder) {
        return res.status(400).json({ 
          message: 'Title, explanation, and step order are required' 
        });
      }

      let stepImages = null;
      if (req.files && Array.isArray(req.files)) {
        stepImages = req.files.map(file => `/uploads/projects/${file.filename}`);
      }

      const stepId = await Step.create(projectId, title, explanation, codeSnippet, stepOrder, null, null, stepImages);
      
      const step = await Step.getById(stepId);
      res.status(201).json({
        message: 'Step created successfully',
        step
      });
    } catch (error) {
      console.error('Create step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async updateStep(req, res) {
    try {
      const { stepId } = req.params;
      const { title, explanation, codeSnippet, stepOrder } = req.body;

      let stepImages = null;
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        stepImages = req.files.map(file => `/uploads/projects/${file.filename}`);
      }

      const success = await Step.update(stepId, title, explanation, codeSnippet, stepOrder, null, null, stepImages);
      
      if (!success) {
        return res.status(404).json({ message: 'Step not found' });
      }

      const step = await Step.getById(stepId);
      res.json({
        message: 'Step updated successfully',
        step
      });
    } catch (error) {
      console.error('Update step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async deleteStep(req, res) {
    try {
      const { stepId } = req.params;

      const success = await Step.delete(stepId);
      
      if (!success) {
        return res.status(404).json({ message: 'Step not found' });
      }

      res.json({ message: 'Step deleted successfully' });
    } catch (error) {
      console.error('Delete step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getProjectsByLevel(req, res) {
    try {
      const { level } = req.params;
      const projects = await Project.getByLevel(level);
      res.json(projects);
    } catch (error) {
      console.error('Get projects by level error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getProjectsByType(req, res) {
    try {
      const { type } = req.params;
      const projects = await Project.getByType(type);
      res.json(projects);
    } catch (error) {
      console.error('Get projects by type error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getProjectById(req, res) {
    try {
      const { id } = req.params;
      const project = await Project.getById(id);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Also get steps
      const steps = await Step.getByProjectId(id);
      res.json({ ...project, steps });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getStepsByProjectId(req, res) {
    try {
      const { projectId } = req.params;
      const steps = await Step.getByProjectId(projectId);
      res.json(steps);
    } catch (error) {
      console.error('Get steps error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getUserProgress(req, res) {
    try {
      const userId = req.user.id;
      const progress = await Progress.getUserOverallProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async updateProgress(req, res) {
    try {
      const userId = req.user.id;
      const { projectId, stepCompleted } = req.body;

      if (!projectId || stepCompleted === undefined) {
        return res.status(400).json({ message: 'Project ID and step completed are required' });
      }

      await Progress.createOrUpdate(userId, projectId, stepCompleted);

      res.json({ message: 'Progress updated successfully' });
    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getDashboardStats(req, res) {
    try {
      const userId = req.user.id;
      
      const completedCount = await Progress.getCompletedProjectsCount(userId);
      const activeProject = await Progress.getCurrentActiveProject(userId);
      const overallProgress = await Progress.getUserOverallProgress(userId);

      res.json({
        completedProjects: completedCount,
        activeProject,
        overallProgress
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = projectController;
