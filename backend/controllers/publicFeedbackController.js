const Feedback = require('../models/feedbackModel');
const feedbackQueueService = require('../services/feedbackQueueService');
const documentService = require('../services/documentService');
let socketModule = null;
try {
  socketModule = require('../socket');
} catch {}

const publicFeedbackController = {
  /**
   * GET /api/public/feedback/:token
   * Public endpoint to load student feedback form & questions without login
   */
  async getByToken(req, res) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      const data = await Feedback.getByToken(token);
      if (!data) {
        return res.status(404).json({ message: 'Invalid or expired feedback link' });
      }

      return res.json({
        success: true,
        data
      });
    } catch (err) {
      console.error('[PublicFeedbackController] getByToken error:', err);
      return res.status(500).json({ message: 'Failed to load feedback form' });
    }
  },

  /**
   * POST /api/public/feedback/:token/submit
   * High-concurrency public submission endpoint (Queue backed)
   */
  async submitByToken(req, res) {
    try {
      const { token } = req.params;
      const { answers, overall_feedback, overallFeedback } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      const data = await Feedback.getByToken(token);
      if (!data) {
        return res.status(404).json({ message: 'Invalid or expired feedback link' });
      }

      // Check if submission is locked
      if (data.link_status === 'SUBMITTED' || data.link_status === 'EDIT_REQUESTED') {
        return res.status(400).json({
          message: 'Your form has already been submitted. If you wish to re-edit, please request permission.',
          status: data.link_status
        });
      }

      // Validate required questions
      for (const q of (data.questions || [])) {
        if (q.is_required) {
          const matchingAns = (answers || []).find(a => Number(a.questionId || a.question_id) === Number(q.id));
          if (!matchingAns) {
            return res.status(400).json({ message: `Please answer required question: "${q.question_text}"` });
          }
          if (q.question_type === 'RATING') {
            if (matchingAns.ratingValue === null || matchingAns.ratingValue === undefined) {
              return res.status(400).json({ message: `Please provide a rating for: "${q.question_text}"` });
            }
          } else {
            if (!matchingAns.answerText || !String(matchingAns.answerText).trim()) {
              return res.status(400).json({ message: `Please provide an answer for: "${q.question_text}"` });
            }
          }
        }
      }

      // Enqueue submission asynchronously for zero-latency, high-scale handling
      const job = await feedbackQueueService.enqueue({
        feedbackId: data.feedback_id,
        studentId: data.student_id,
        batchId: data.batch_id,
        overallFeedback: overall_feedback || overallFeedback || null,
        answers: answers || [],
        token
      });

      // Respond immediately (< 40ms) to student with success confirmation!
      return res.status(200).json({
        success: true,
        message: 'Your form has been submitted successfully.',
        status: 'SUBMITTED',
        jobId: job.jobId
      });
    } catch (err) {
      console.error('[PublicFeedbackController] submitByToken error:', err);
      return res.status(500).json({ message: 'Failed to submit feedback' });
    }
  },

  /**
   * POST /api/public/feedback/:token/request-edit
   * Student requests re-edit permission after submission
   */
  async requestEditAccess(req, res) {
    try {
      const { token } = req.params;
      const { reason } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      const data = await Feedback.getByToken(token);
      if (!data) {
        return res.status(404).json({ message: 'Invalid feedback link' });
      }

      await Feedback.requestEditAccess(token, reason);

      // Notify coordinators via socket
      try {
        const io = socketModule?.getIO?.();
        if (io) {
          io.to('role:coordinator').emit('feedback-edit-requested', {
            feedbackId: data.feedback_id,
            studentId: data.student_id,
            studentName: data.student_name,
            batchName: data.batch_name,
            reason: reason || 'Requested permission to re-edit feedback'
          });
        }
      } catch {}

      return res.json({
        success: true,
        message: 'Edit request sent to coordinator successfully. Please wait for approval.',
        status: 'EDIT_REQUESTED'
      });
    } catch (err) {
      console.error('[PublicFeedbackController] requestEditAccess error:', err);
      return res.status(500).json({ message: 'Failed to request edit access' });
    }
  },

  /**
   * GET /api/public/feedback/catalog/:token
   * Public read-only catalog endpoint for higher officials to review feedback
   */
  async getCatalogByToken(req, res) {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      const report = await Feedback.getReportByShareToken(token);
      if (!report) {
        return res.status(404).json({ message: 'Feedback report link is invalid or expired' });
      }

      return res.json({
        success: true,
        data: report
      });
    } catch (err) {
      console.error('[PublicFeedbackController] getCatalogByToken error:', err);
      return res.status(500).json({ message: 'Failed to load feedback catalog' });
    }
  },

  /**
   * GET /api/public/feedback/catalog/:token/export/pdf
   * Public download of feedback PDF for higher officials
   */
  async exportPublicCatalogPDF(req, res) {
    try {
      const { token } = req.params;
      const report = await Feedback.getReportByShareToken(token);
      if (!report) {
        return res.status(404).send('Feedback report link is invalid or expired');
      }

      const buffer = await documentService.generateFeedbackPDF(report);
      const safeTitle = (report.campaign.title || 'Feedback').replace(/[^a-zA-Z0-9_-]/g, '_');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_Report.pdf"`);
      return res.send(buffer);
    } catch (err) {
      console.error('[PublicFeedbackController] exportPublicCatalogPDF error:', err);
      return res.status(500).send('Failed to generate PDF report');
    }
  },

  /**
   * GET /api/public/feedback/catalog/:token/export/docx
   * Public download of feedback Word Document (.docx) for higher officials
   */
  async exportPublicCatalogDOCX(req, res) {
    try {
      const { token } = req.params;
      const report = await Feedback.getReportByShareToken(token);
      if (!report) {
        return res.status(404).send('Feedback report link is invalid or expired');
      }

      const buffer = await documentService.generateFeedbackDOCX(report);
      const safeTitle = (report.campaign.title || 'Feedback').replace(/[^a-zA-Z0-9_-]/g, '_');
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_Report.docx"`);
      return res.send(buffer);
    } catch (err) {
      console.error('[PublicFeedbackController] exportPublicCatalogDOCX error:', err);
      return res.status(500).send('Failed to generate Word report');
    }
  }
};

module.exports = publicFeedbackController;
