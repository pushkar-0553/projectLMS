const StudentProgress = require('../models/studentProgressModel');
const StepProgress = require('../models/stepProgressModel');
const Step = require('../models/stepModel');
const Project = require('../models/projectModel');

const simpleProgressController = {
  // Complete a step in a SIMPLE project (no approval needed)
  async completeSimpleStep(req, res) {
    try {
      const { projectId, stepId } = req.body;
      const userId = req.user.id;

      // Verify this is a simple project
      const project = await Project.getById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (project.type !== 'simple') {
        return res.status(400).json({ message: 'This endpoint is for simple projects only. Use submit-step for main projects.' });
      }

      // Validate step exists and belongs to project
      const step = await Step.getById(stepId);
      if (!step || step.project_id != projectId) {
        return res.status(404).json({ message: 'Step not found in this project' });
      }

      // Directly complete the step (no approval needed for simple projects)
      await StepProgress.completeStep(userId, stepId, projectId);

      // Get updated progress
      const progressPercentage = await StepProgress.getProgressPercentage(userId, projectId);
      const nextStep = await Step.getNextStep(userId, projectId);

      res.json({
        message: 'Step completed successfully',
        progressPercentage,
        nextStep,
        projectCompleted: progressPercentage === 100
      });
    } catch (error) {
      console.error('Complete simple step error:', error);
      res.status(400).json({ message: error.message || 'Failed to complete step' });
    }
  },

  // Submit step for approval (MAIN projects only)
  async submitStep(req, res) {
    try {
      const { projectId, stepId } = req.body;
      const userId = req.user.id;

      // Verify this is a main project
      const project = await Project.getById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check if user already submitted this step
      const existing = await StudentProgress.findByUserAndStep(userId, stepId);
      
      if (existing && existing.status === 'approved') {
        return res.status(400).json({ message: 'Step already approved' });
      }

      // For main projects, check if previous step is approved
      if (project.type === 'main') {
        const step = await Step.getById(stepId);
        if (step && step.step_order > 1) {
          // Get previous step
          const [prevSteps] = await require('../config/db').execute(
            'SELECT id FROM Steps WHERE project_id = ? AND step_order = ?',
            [projectId, step.step_order - 1]
          );
          if (prevSteps.length > 0) {
            const prevProgress = await StudentProgress.findByUserAndStep(userId, prevSteps[0].id);
            if (!prevProgress || prevProgress.status !== 'approved') {
              return res.status(400).json({ message: 'Previous step must be approved first' });
            }
          }
        }
      }

      // Create or update progress submission
      const progressId = await StudentProgress.create(userId, projectId, stepId);

      res.status(201).json({
        message: 'Step submitted for approval',
        progressId
      });
    } catch (error) {
      console.error('Submit step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get user's learning progress
  async getUserProgress(req, res) {
    try {
      const userId = req.user.id;
      const { projectId } = req.query;

      // Fetch progress from StudentProgress (Main projects / Approvals)
      const mainProgress = await StudentProgress.getUserProgress(userId, projectId);
      
      // Fetch progress from StepProgress (Simple projects / Self-learning)
      const [simpleProgress] = await require('../config/db').execute(
        `SELECT sp.*, p.title as project_title, p.type as project_type, 
                s.title as step_title, s.step_order,
                'approved' as status, sp.completion_time as submitted_at
         FROM StepProgress sp
         JOIN Projects p ON sp.project_id = p.id
         JOIN Steps s ON sp.step_id = s.id
         WHERE sp.user_id = ? ${projectId ? 'AND sp.project_id = ?' : ''}
         AND sp.completed = TRUE`,
        projectId ? [userId, projectId] : [userId]
      );

      // Merge and sort
      const mergedProgress = [...mainProgress, ...simpleProgress].sort((a, b) => {
        if (a.project_id !== b.project_id) return a.project_id - b.project_id;
        return a.step_order - b.step_order;
      });

      res.json(mergedProgress);
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get current step for a project
  async getCurrentStep(req, res) {
    try {
      const userId = req.user.id;
      const { projectId } = req.params;

      const currentStep = await StudentProgress.getCurrentStep(userId, projectId);
      
      if (!currentStep) {
        const nextStep = await StudentProgress.getNextAvailableStep(userId, projectId);
        return res.json({ currentStep: null, nextStep });
      }

      res.json({ currentStep, nextStep: null });
    } catch (error) {
      console.error('Get current step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get student learning statistics
  async getStudentStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await StudentProgress.getStudentStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Get student stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get next available step for learning
  async getNextStep(req, res) {
    try {
      const userId = req.user.id;
      const { projectId } = req.params;

      const nextStep = await StudentProgress.getNextAvailableStep(userId, projectId);
      
      if (!nextStep) {
        return res.json({ message: 'No more steps available' });
      }

      res.json(nextStep);
    } catch (error) {
      console.error('Get next step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = simpleProgressController;
