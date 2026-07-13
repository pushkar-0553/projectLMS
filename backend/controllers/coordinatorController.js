const pool = require('../config/db');
const Batch = require('../models/batchModel');
const Task = require('../models/taskModel');
const Activity = require('../models/activityModel');
const StepProgress = require('../models/stepProgressModel');
const { logActivity } = require('../utils/auditLogger');

const coordinatorController = {
  // --- SUB-BATCH MANAGEMENT ---

  async createSubBatch(req, res) {
    try {
      const { batchId, name, classLink } = req.body;
      const coordinatorId = req.user.id;

      const subBatchId = await Batch.createSubBatch(batchId, name, coordinatorId, classLink);

      await logActivity(
        coordinatorId,
        'coordinator',
        'CREATE_SUBBATCH',
        'subbatch',
        subBatchId,
        `Created sub-batch: ${name}`
      );

      res.status(201).json({ message: 'Sub-batch created successfully', subBatchId });
    } catch (error) {
      console.error('Create sub-batch error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async updateSubBatchClassLink(req, res) {
    try {
      const { subBatchId } = req.params;
      const { classLink } = req.body;
      const coordinatorId = req.user.id;

      const updated = await Batch.updateSubBatchClassLink(subBatchId, classLink, coordinatorId);
      if (!updated) {
        return res.status(404).json({ message: 'Sub-batch not found' });
      }

      await logActivity(
        coordinatorId,
        'coordinator',
        'UPDATE_CLASS_LINK',
        'subbatch',
        Number(subBatchId),
        `Updated class link for sub-batch ID: ${subBatchId}`
      );

      res.json({ message: 'Class link updated successfully' });
    } catch (error) {
      console.error('Update sub-batch class link error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getMySubBatches(req, res) {
    try {
      const coordinatorId = req.user.id;
      const subBatches = await Batch.getSubBatchesByCoordinator(coordinatorId);
      res.json(subBatches);
    } catch (error) {
      console.error('Get my sub-batches error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async assignStudentToSubBatch(req, res) {
    try {
      const { userId, batchId, subBatchId } = req.body;
      const coordinatorId = req.user.id;

      await Batch.assignStudent(userId, batchId, subBatchId);

      await logActivity(
        coordinatorId,
        'coordinator',
        'ASSIGN_STUDENT',
        'user',
        userId,
        `Assigned student to sub-batch ID: ${subBatchId}`
      );

      res.json({ message: 'Student assigned successfully' });
    } catch (error) {
      console.error('Assign student error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // --- TASK MANAGEMENT ---

  async createTask(req, res) {
    try {
      const { title, description, file_path, assigned_type, deadline } = req.body;
      const coordinatorId = req.user.id;

      const taskId = await Task.create({
        title,
        description,
        file_path,
        created_by: coordinatorId,
        assigned_type,
        deadline
      });

      await logActivity(
        coordinatorId,
        'coordinator',
        'CREATE_TASK',
        'task',
        taskId,
        `Created task: ${title}`
      );

      res.status(201).json({ message: 'Task created successfully', taskId });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async assignTask(req, res) {
    try {
      const { taskId, batchId, subBatchId, studentId } = req.body;
      const coordinatorId = req.user.id;

      // Issue #16 fix: Verify task was created by this coordinator
      const [taskRows] = await pool.execute(
        'SELECT id FROM Tasks WHERE id = ? AND created_by = ?',
        [taskId, coordinatorId]
      );
      if (taskRows.length === 0) {
        return res.status(403).json({ message: 'You can only assign tasks you created' });
      }

      // If assigning to a specific student, verify they're in coordinator's batch
      if (studentId) {
        const [studentBatch] = await pool.execute(
          `SELECT sbm.student_id FROM StudentBatchMap sbm
           JOIN SubBatches sb ON sbm.sub_batch_id = sb.id
           WHERE sbm.student_id = ? AND sb.created_by = ?`,
          [studentId, coordinatorId]
        );
        if (studentBatch.length === 0) {
          // Also check direct batch assignment
          const [directBatch] = await pool.execute(
            `SELECT sbm.student_id FROM StudentBatchMap sbm
             JOIN Batches b ON sbm.batch_id = b.id
             WHERE sbm.student_id = ? AND b.coordinator_id = ?`,
            [studentId, coordinatorId]
          );
          if (directBatch.length === 0) {
            return res.status(403).json({ message: 'Student is not in your batch' });
          }
        }
      }

      await Task.assign(taskId, {
        batch_id: batchId,
        sub_batch_id: subBatchId,
        student_id: studentId
      });

      await logActivity(
        coordinatorId,
        'coordinator',
        'ASSIGN_TASK',
        'task',
        taskId,
        `Assigned task to target(s)`
      );

      res.json({ message: 'Task assigned successfully' });
    } catch (error) {
      console.error('Assign task error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getMyTasks(req, res) {
    try {
      const coordinatorId = req.user.id;
      const tasks = await Task.getTasksByCoordinator(coordinatorId);
      res.json(tasks);
    } catch (error) {
      console.error('Get my tasks error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // --- SUBMISSIONS & REVIEW ---

  async getTaskSubmissions(req, res) {
    try {
      const { taskId } = req.params;
      const submissions = await Task.getSubmissionsByTask(taskId);
      res.json(submissions);
    } catch (error) {
      console.error('Get task submissions error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async reviewSubmission(req, res) {
    try {
      const { submissionId, status, feedback } = req.body;
      const coordinatorId = req.user.id;

      await Task.reviewSubmission(submissionId, {
        status,
        feedback,
        reviewerId: coordinatorId
      });

      await logActivity(
        coordinatorId,
        'coordinator',
        'REVIEW_SUBMISSION',
        'submission',
        submissionId,
        `Reviewed submission with status: ${status}`
      );

      res.json({ message: 'Submission reviewed successfully' });
    } catch (error) {
      console.error('Review submission error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // --- HISTORY ---

  async getMyHistory(req, res) {
    try {
      const coordinatorId = req.user.id;
      const history = await Activity.getByCoordinator(coordinatorId);
      res.json(history);
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // --- DASHBOARD STATS ---

  async getDashboardStats(req, res) {
    try {
      const coordinatorId = req.user.id;
      
      // Issue #11 fix: Scope stats to coordinator's batches
      const [stats] = await pool.execute(`
        SELECT 
          (SELECT COUNT(DISTINCT sbm.student_id) FROM StudentBatchMap sbm
           JOIN Batches b ON sbm.batch_id = b.id
           WHERE b.coordinator_id = ?) as total_students,
          (SELECT COUNT(*) FROM StudentProgress sp
           JOIN Users u ON sp.user_id = u.id
           JOIN StudentBatchMap sbm ON u.id = sbm.student_id
           JOIN Batches b ON sbm.batch_id = b.id
           WHERE sp.status = 'pending' AND b.coordinator_id = ?) as pending_approvals,
          (SELECT COUNT(*) FROM StudentProgress sp
           JOIN Users u ON sp.user_id = u.id
           JOIN StudentBatchMap sbm ON u.id = sbm.student_id
           JOIN Batches b ON sbm.batch_id = b.id
           WHERE sp.status = 'approved' AND b.coordinator_id = ?) as total_approvals,
          (SELECT COUNT(*) FROM SubBatches WHERE created_by = ?) as total_subbatches
        FROM DUAL
      `, [coordinatorId, coordinatorId, coordinatorId, coordinatorId]);
      
      res.json(stats[0]);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getPendingApprovals(req, res) {
    try {
      const coordinatorId = req.user.id;
      // Issue #13 fix: Filter pending approvals to coordinator's batches only
      const [rows] = await pool.execute(`
        SELECT sp.*, u.name as student_name, p.title as project_title, s.title as step_title, s.step_order as order_index
        FROM StudentProgress sp
        JOIN Users u ON sp.user_id = u.id
        JOIN Projects p ON sp.project_id = p.id
        JOIN Steps s ON sp.step_id = s.id
        JOIN StudentBatchMap sbm ON sp.user_id = sbm.student_id
        JOIN Batches b ON sbm.batch_id = b.id
        WHERE sp.status = 'pending' AND b.coordinator_id = ?
        ORDER BY sp.submitted_at DESC
      `, [coordinatorId]);
      res.json(rows);
    } catch (error) {
      console.error('Get pending approvals error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getProjectStats(req, res) {
    try {
      // Issue #15 fix: Use StepProgress and StudentProgress instead of non-existent Progress table
      const [rows] = await pool.execute(`
        SELECT p.title as name, COUNT(DISTINCT users.user_id) as students
        FROM Projects p
        LEFT JOIN (
          SELECT user_id, project_id FROM StepProgress
          UNION
          SELECT user_id, project_id FROM StudentProgress
          UNION
          SELECT student_id as user_id, project_id FROM StudentProjects
        ) users ON p.id = users.project_id
        GROUP BY p.id, p.title
        HAVING students > 0
      `);
      res.json(rows);
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async getStudentProgress(req, res) {
    try {
      const { studentId } = req.params;
      const [rows] = await pool.execute(`
        SELECT sp.*, p.title as project_title, s.title as step_title
        FROM StudentProgress sp
        JOIN Projects p ON sp.project_id = p.id
        JOIN Steps s ON sp.step_id = s.id
        WHERE sp.user_id = ?
        ORDER BY sp.submitted_at DESC
      `, [studentId]);
      res.json(rows);
    } catch (error) {
      console.error('Get student progress error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async approveStep(req, res) {
    try {
      const { progressId } = req.params;
      const { feedback } = req.body;
      const reviewerId = req.user.id;

      // Issue #14 fix: Verify student belongs to coordinator's batch
      const [ownership] = await pool.execute(
        `SELECT sp.id FROM StudentProgress sp
         JOIN StudentBatchMap sbm ON sp.user_id = sbm.student_id
         JOIN Batches b ON sbm.batch_id = b.id
         WHERE sp.id = ? AND b.coordinator_id = ?`,
        [progressId, reviewerId]
      );
      if (ownership.length === 0) {
        return res.status(403).json({ message: 'You can only approve steps for students in your batches' });
      }

      await pool.execute(
        'UPDATE StudentProgress SET status = "approved", feedback = ?, reviewer_id = ?, reviewed_at = NOW() WHERE id = ?',
        [feedback, reviewerId, progressId]
      );

      // Also mark as completed in StepProgress for access control
      const [progress] = await pool.execute('SELECT user_id, step_id, project_id FROM StudentProgress WHERE id = ?', [progressId]);
      if (progress.length > 0) {
        const { user_id, step_id, project_id } = progress[0];
        
        // Use a transaction or sequential updates to ensure consistency
        await pool.execute(
          'INSERT INTO StepProgress (user_id, step_id, project_id, completed, completion_time) VALUES (?, ?, ?, TRUE, NOW()) ON DUPLICATE KEY UPDATE completed = TRUE, completion_time = NOW()',
          [user_id, step_id, project_id]
        );

        // Update the Progress summary table (this is what the graph uses)
        await StepProgress.updateProjectProgress(user_id, project_id);
      }

      res.json({ message: 'Step approved successfully' });
    } catch (error) {
      console.error('Approve step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async rejectStep(req, res) {
    try {
      const { progressId } = req.params;
      const { feedback } = req.body;
      const reviewerId = req.user.id;

      // Issue #14 fix: Verify student belongs to coordinator's batch
      const [ownership] = await pool.execute(
        `SELECT sp.id FROM StudentProgress sp
         JOIN StudentBatchMap sbm ON sp.user_id = sbm.student_id
         JOIN Batches b ON sbm.batch_id = b.id
         WHERE sp.id = ? AND b.coordinator_id = ?`,
        [progressId, reviewerId]
      );
      if (ownership.length === 0) {
        return res.status(403).json({ message: 'You can only reject steps for students in your batches' });
      }

      await pool.execute(
        'UPDATE StudentProgress SET status = "rejected", feedback = ?, reviewer_id = ?, reviewed_at = NOW() WHERE id = ?',
        [feedback, reviewerId, progressId]
      );

      res.json({ message: 'Step rejected successfully' });
    } catch (error) {
      console.error('Reject step error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = coordinatorController;
