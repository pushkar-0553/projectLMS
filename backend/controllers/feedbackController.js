const Feedback = require('../models/feedbackModel');
const Course = require('../models/courseModel');
const documentService = require('../services/documentService');

// Helper to resolve course ID from request (body, query, headers, or user session)
async function resolveCourseId(req) {
  let courseId = req.query?.courseId || req.body?.course_id || req.body?.courseId || req.params?.courseId;
  if (!courseId) {
    const slug = req.headers['x-course-slug'] || req.query?.courseSlug || req.params?.courseSlug;
    if (slug) {
      const course = await Course.findBySlug(slug);
      if (course) courseId = course.id;
    }
  }
  if (!courseId && req.user && req.user.role !== 'super_admin' && req.user.course_id) {
    courseId = req.user.course_id;
  }
  return courseId ? parseInt(courseId, 10) : null;
}

const feedbackController = {
  /**
   * POST /api/feedback
   * Create a new feedback campaign
   */
  async createFeedback(req, res) {
    try {
      const {
        title,
        description,
        feedback_date,
        feedbackDate,
        batch_ids,
        batchIds,
        questions
      } = req.body;

      const dateVal = feedback_date || feedbackDate;
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Feedback title is required' });
      }

      if (!dateVal) {
        return res.status(400).json({ message: 'Feedback date is required' });
      }

      const courseId = await resolveCourseId(req);
      if (!courseId) {
        return res.status(400).json({ message: 'Target course is required' });
      }

      const selectedBatches = batch_ids || batchIds || [];
      if (!Array.isArray(selectedBatches) || selectedBatches.length === 0) {
        return res.status(400).json({ message: 'At least one batch must be selected' });
      }

      const questionsList = questions || [];
      if (!Array.isArray(questionsList) || questionsList.length === 0) {
        return res.status(400).json({ message: 'At least one question is required' });
      }

      const createdBy = req.user?.id || null;

      const feedbackId = await Feedback.create({
        title: title.trim(),
        description: description ? description.trim() : null,
        courseId,
        feedbackDate: dateVal,
        batchIds: selectedBatches,
        questions: questionsList,
        createdBy
      });

      const campaign = await Feedback.getById(feedbackId);

      return res.status(201).json({
        success: true,
        message: 'Feedback campaign created successfully',
        data: campaign
      });
    } catch (err) {
      console.error('[FeedbackController] create error:', err);
      return res.status(500).json({ message: err.message || 'Failed to create feedback campaign' });
    }
  },

  /**
   * GET /api/feedback
   * List all feedback campaigns for course or system
   */
  async getAllFeedbacks(req, res) {
    try {
      const courseId = await resolveCourseId(req);
      const { search, status } = req.query;

      const campaigns = await Feedback.getAll({
        courseId: (req.user?.role === 'super_admin' && !courseId) ? null : courseId,
        search,
        status
      });

      return res.json(campaigns);
    } catch (err) {
      console.error('[FeedbackController] getAll error:', err);
      return res.status(500).json({ message: 'Failed to retrieve feedback campaigns' });
    }
  },

  /**
   * GET /api/feedback/:id
   * Get single feedback campaign details, batches, questions, and statistics
   */
  async getFeedbackDetail(req, res) {
    try {
      const { id } = req.params;
      const campaign = await Feedback.getById(id);

      if (!campaign) {
        return res.status(404).json({ message: 'Feedback campaign not found' });
      }

      return res.json(campaign);
    } catch (err) {
      console.error('[FeedbackController] getById error:', err);
      return res.status(500).json({ message: 'Failed to load feedback details' });
    }
  },

  /**
   * PUT /api/feedback/:id
   * Update feedback campaign details, batches, and questions
   */
  async updateFeedback(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        feedback_date,
        feedbackDate,
        status,
        batch_ids,
        batchIds,
        questions
      } = req.body;

      const dateVal = feedback_date !== undefined ? feedback_date : feedbackDate;
      const selectedBatches = batch_ids !== undefined ? batch_ids : batchIds;

      const updated = await Feedback.update(id, {
        title,
        description,
        feedbackDate: dateVal,
        status,
        batchIds: selectedBatches,
        questions
      });

      if (!updated) {
        return res.status(404).json({ message: 'Feedback campaign not found' });
      }

      const campaign = await Feedback.getById(id);
      return res.json({
        success: true,
        message: 'Feedback campaign updated successfully',
        data: campaign
      });
    } catch (err) {
      console.error('[FeedbackController] update error:', err);
      return res.status(500).json({ message: err.message || 'Failed to update feedback campaign' });
    }
  },

  /**
   * DELETE /api/feedback/:id
   * Delete feedback campaign
   */
  async deleteFeedback(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Feedback.delete(id);

      if (!deleted) {
        return res.status(404).json({ message: 'Feedback campaign not found' });
      }

      return res.json({
        success: true,
        message: 'Feedback campaign deleted successfully'
      });
    } catch (err) {
      console.error('[FeedbackController] delete error:', err);
      return res.status(500).json({ message: 'Failed to delete feedback campaign' });
    }
  },

  /**
   * GET /api/feedback/:id/students
   * Get eligible students batch-wise for a feedback campaign
   */
  async getStudents(req, res) {
    try {
      const { id } = req.params;
      const { search, batch, batchFilter, status, statusFilter } = req.query;

      const students = await Feedback.getStudents(id, {
        search,
        batchFilter: batch || batchFilter || '',
        statusFilter: status || statusFilter || ''
      });

      return res.json(students);
    } catch (err) {
      console.error('[FeedbackController] getStudents error:', err);
      return res.status(500).json({ message: 'Failed to load eligible students' });
    }
  },

  /**
   * GET /api/feedback/:id/responses/:studentId
   * Get submitted response and answers for a specific student
   */
  async getStudentResponse(req, res) {
    try {
      const { id, studentId } = req.params;
      const response = await Feedback.getStudentResponse(id, studentId);

      if (!response) {
        return res.status(404).json({ message: 'No response found for this student' });
      }

      return res.json(response);
    } catch (err) {
      console.error('[FeedbackController] getStudentResponse error:', err);
      return res.status(500).json({ message: 'Failed to fetch student feedback response' });
    }
  },

  /**
   * POST /api/feedback/:id/responses
   * Submit student feedback response with answers (prevents accidental duplicates)
   */
  async submitResponse(req, res) {
    try {
      const { id } = req.params;
      const {
        student_id,
        studentId,
        batch_id,
        batchId,
        overall_feedback,
        overallFeedback,
        answers
      } = req.body;

      const targetStudentId = student_id || studentId;
      if (!targetStudentId) {
        return res.status(400).json({ message: 'Student ID is required' });
      }

      const submittedBy = req.user?.id || null;

      const responseId = await Feedback.submitResponse({
        feedbackId: id,
        studentId: targetStudentId,
        batchId: batch_id || batchId || null,
        overallFeedback: overall_feedback || overallFeedback || null,
        answers: answers || [],
        submittedBy
      });

      const fullResponse = await Feedback.getStudentResponse(id, targetStudentId);

      return res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: fullResponse
      });
    } catch (err) {
      console.error('[FeedbackController] submitResponse error:', err);
      return res.status(500).json({ message: err.message || 'Failed to submit feedback response' });
    }
  },

  /**
   * PUT /api/feedback/:id/responses/:studentId
   * Edit or update an existing submitted response
   */
  async updateStudentResponse(req, res) {
    try {
      const { id, studentId } = req.params;
      const {
        batch_id,
        batchId,
        overall_feedback,
        overallFeedback,
        answers
      } = req.body;

      const submittedBy = req.user?.id || null;

      await Feedback.submitResponse({
        feedbackId: id,
        studentId,
        batchId: batch_id || batchId || null,
        overallFeedback: overall_feedback || overallFeedback || null,
        answers: answers || [],
        submittedBy
      });

      const fullResponse = await Feedback.getStudentResponse(id, studentId);

      return res.json({
        success: true,
        message: 'Feedback updated successfully',
        data: fullResponse
      });
    } catch (err) {
      console.error('[FeedbackController] updateStudentResponse error:', err);
      return res.status(500).json({ message: err.message || 'Failed to update feedback response' });
    }
  },

  /**
   * POST /api/feedback/:id/links/:studentId/allow-edit
   * Coordinator grants student permission to re-edit their submitted feedback
   */
  async allowEditAccess(req, res) {
    try {
      const { id, studentId } = req.params;
      const coordinatorId = req.user?.id || null;

      await Feedback.allowEditAccess(id, studentId, coordinatorId);

      return res.json({
        success: true,
        message: 'Edit permission granted to student successfully.'
      });
    } catch (err) {
      console.error('[FeedbackController] allowEditAccess error:', err);
      return res.status(500).json({ message: 'Failed to grant edit permission' });
    }
  },

  /**
   * POST /api/feedback/:id/links/:studentId/reject-edit
   * Coordinator rejects/revokes edit request
   */
  async rejectEditAccess(req, res) {
    try {
      const { id, studentId } = req.params;

      await Feedback.rejectEditAccess(id, studentId);

      return res.json({
        success: true,
        message: 'Edit request declined.'
      });
    } catch (err) {
      console.error('[FeedbackController] rejectEditAccess error:', err);
      return res.status(500).json({ message: 'Failed to decline edit request' });
    }
  },

  /**
   * GET /api/feedback/:id/edit-requests
   * Coordinator retrieves all pending edit requests for this campaign
   */
  async getEditRequests(req, res) {
    try {
      const { id } = req.params;
      const requests = await Feedback.getEditRequests(id);
      return res.json(requests);
    } catch (err) {
      console.error('[FeedbackController] getEditRequests error:', err);
      return res.status(500).json({ message: 'Failed to load edit requests' });
    }
  },

  /**
   * GET /api/feedback/:id/report
   * Common report data for Viewer, Flipbook, Catalog, and Exports
   */
  async getReportData(req, res) {
    try {
      const { id } = req.params;
      const report = await Feedback.getReportData(id);
      if (!report) {
        return res.status(404).json({ message: 'Feedback campaign not found' });
      }
      return res.json(report);
    } catch (err) {
      console.error('[FeedbackController] getReportData error:', err);
      return res.status(500).json({ message: 'Failed to load report data' });
    }
  },

  /**
   * POST /api/feedback/:id/share-token
   * Generate or renew public share token for this feedback campaign
   */
  async generateShareToken(req, res) {
    try {
      const { id } = req.params;
      const campaign = await Feedback.getById(id);
      if (!campaign) {
        return res.status(404).json({ message: 'Feedback campaign not found' });
      }
      const token = await Feedback.generateCampaignShareToken(id);
      return res.json({
        success: true,
        share_token: token,
        message: 'Share link generated successfully.'
      });
    } catch (err) {
      console.error('[FeedbackController] generateShareToken error:', err);
      return res.status(500).json({ message: 'Failed to generate share token' });
    }
  },

  /**
   * DELETE /api/feedback/:id/share-token
   * Revoke public share link for this feedback campaign
   */
  async revokeShareToken(req, res) {
    try {
      const { id } = req.params;
      await Feedback.revokeCampaignShareToken(id);
      return res.json({
        success: true,
        message: 'Share link revoked successfully.'
      });
    } catch (err) {
      console.error('[FeedbackController] revokeShareToken error:', err);
      return res.status(500).json({ message: 'Failed to revoke share token' });
    }
  },

  /**
   * GET /api/feedback/:id/export/pdf
   * Download feedback report as professional PDF
   */
  async exportPDF(req, res) {
    try {
      const { id } = req.params;
      const report = await Feedback.getReportData(id);
      if (!report) {
        return res.status(404).send('Feedback campaign not found');
      }

      const buffer = await documentService.generateFeedbackPDF(report);
      const safeTitle = (report.campaign.title || 'Feedback').replace(/[^a-zA-Z0-9_-]/g, '_');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_Report.pdf"`);
      return res.send(buffer);
    } catch (err) {
      console.error('[FeedbackController] exportPDF error:', err);
      return res.status(500).send('Failed to generate PDF report');
    }
  },

  /**
   * GET /api/feedback/:id/export/docx
   * Download feedback report as professional Word Document (.docx)
   */
  async exportDOCX(req, res) {
    try {
      const { id } = req.params;
      const report = await Feedback.getReportData(id);
      if (!report) {
        return res.status(404).send('Feedback campaign not found');
      }

      const buffer = await documentService.generateFeedbackDOCX(report);
      const safeTitle = (report.campaign.title || 'Feedback').replace(/[^a-zA-Z0-9_-]/g, '_');
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_Report.docx"`);
      return res.send(buffer);
    } catch (err) {
      console.error('[FeedbackController] exportDOCX error:', err);
      return res.status(500).send('Failed to generate Word report');
    }
  }
};

module.exports = feedbackController;
