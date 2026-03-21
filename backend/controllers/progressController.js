const StepProgress = require('../models/stepProgressModel');
const Step = require('../models/stepModel');
const Project = require('../models/projectModel');

const progressController = {
  // Complete a step
  async completeStep(req, res) {
    try {
      const { stepId, projectId } = req.body;
      const userId = req.user.id;

      console.log('Completing step:', { userId, stepId, projectId });

      // Validate step exists and belongs to project
      const step = await Step.getById(stepId);
      if (!step || step.project_id != projectId) {
        return res.status(404).json({ message: 'Step not found' });
      }

      // Complete the step (this includes validation of previous steps)
      await StepProgress.completeStep(userId, stepId, projectId);

      // Get updated progress
      const progress = await StepProgress.updateProjectProgress(userId, projectId);
      const progressPercentage = await StepProgress.getProgressPercentage(userId, projectId);
      const nextStep = await Step.getNextStep(userId, projectId);

      res.json({
        message: 'Step completed successfully',
        progress,
        progressPercentage,
        nextStep,
        projectCompleted: progress.isCompleted
      });

    } catch (error) {
      console.error('Complete step error:', error);
      res.status(400).json({ 
        message: error.message || 'Failed to complete step' 
      });
    }
  },

  // Get user's progress for a project
  async getProjectProgress(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      // Get project details
      const project = await Project.getById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Get steps with progress
      const steps = await Step.getWithUserProgress(userId, projectId);
      const progressPercentage = await StepProgress.getProgressPercentage(userId, projectId);
      const currentStep = await StepProgress.getCurrentStep(userId, projectId);

      res.json({
        project,
        steps,
        progressPercentage,
        currentStep,
        totalSteps: steps.length,
        completedSteps: steps.filter(s => s.is_completed).length
      });

    } catch (error) {
      console.error('Get project progress error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get user's overall progress across all projects
  async getUserProgress(req, res) {
    try {
      const userId = req.user.id;

      // Get all projects with user progress
      const projects = await Project.getWithUserProgress(userId);
      
      // Calculate overall stats
      const totalProjects = projects.length;
      const completedProjects = projects.filter(p => p.is_completed).length;
      const totalSteps = projects.reduce((sum, p) => sum + (p.total_steps || 0), 0);
      const completedSteps = projects.reduce((sum, p) => sum + (p.completed_steps || 0), 0);
      const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Get next recommended project
      const nextRecommended = await Project.getNextRecommended(userId);

      res.json({
        totalProjects,
        completedProjects,
        totalSteps,
        completedSteps,
        overallProgress,
        projects,
        nextRecommended
      });

    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get roadmap with progress
  async getRoadmap(req, res) {
    try {
      const userId = req.user.id;
      const { level } = req.query;

      // Get projects with progress for specific level or all levels
      const projects = await Project.getWithUserProgress(userId, level);
      
      // Group projects by status
      const groupedProjects = {
        completed: projects.filter(p => p.is_completed),
        active: projects.filter(p => !p.is_completed && p.completed_steps > 0),
        locked: projects.filter(p => !p.is_completed && p.completed_steps === 0)
      };

      // Calculate level progress
      const levelProgress = {};
      const levels = [...new Set(projects.map(p => p.level))];
      
      for (const lvl of levels) {
        const levelProjects = projects.filter(p => p.level === lvl);
        const completedInLevel = levelProjects.filter(p => p.is_completed).length;
        levelProgress[lvl] = {
          total: levelProjects.length,
          completed: completedInLevel,
          percentage: levelProjects.length > 0 ? Math.round((completedInLevel / levelProjects.length) * 100) : 0
        };
      }

      // Get next recommended project
      const nextRecommended = await Project.getNextRecommended(userId);

      res.json({
        projects: groupedProjects,
        levelProgress,
        nextRecommended,
        currentLevel: level ? parseInt(level) : null
      });

    } catch (error) {
      console.error('Get roadmap error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Resume learning - get next incomplete step across all projects
  async resumeLearning(req, res) {
    try {
      const userId = req.user.id;

      // Get projects with progress
      const projects = await Project.getWithUserProgress(userId);
      
      // Find active projects (started but not completed)
      const activeProjects = projects.filter(p => !p.is_completed && p.completed_steps > 0);
      
      if (activeProjects.length > 0) {
        // Get next step for the most recently active project
        const mostRecentProject = activeProjects[0]; // Already ordered by level and order
        const nextStep = await Step.getNextStep(userId, mostRecentProject.id);
        
        return res.json({
          type: 'continue_project',
          project: mostRecentProject,
          step: nextStep,
          message: `Continue learning: ${mostRecentProject.title}`
        });
      }

      // No active projects, get next recommended project
      const nextRecommended = await Project.getNextRecommended(userId);
      
      if (nextRecommended) {
        const firstStep = await Step.getByProjectId(nextRecommended.id);
        
        return res.json({
          type: 'start_new_project',
          project: nextRecommended,
          step: firstStep[0],
          message: `Start learning: ${nextRecommended.title}`
        });
      }

      // All projects completed
      res.json({
        type: 'all_completed',
        message: 'Congratulations! You have completed all available projects.'
      });

    } catch (error) {
      console.error('Resume learning error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Check if user can access a step
  async checkStepAccess(req, res) {
    try {
      const { stepId, projectId } = req.params;
      const userId = req.user.id;

      const canAccess = await StepProgress.canAccessStep(userId, stepId, projectId);
      
      if (!canAccess) {
        return res.status(403).json({ 
          message: 'Previous step must be completed first' 
        });
      }

      res.json({ canAccess: true });

    } catch (error) {
      console.error('Check step access error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = progressController;
