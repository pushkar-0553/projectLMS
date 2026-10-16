const MockInterview = require('../models/mockInterviewModel');
const Course = require('../models/courseModel');

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

const mockInterviewController = {
  /**
   * POST /api/mock-interviews
   * Create a new mock interview drive
   */
  async createMockInterview(req, res) {
    try {
      const {
        title,
        description,
        interview_date,
        interviewDate,
        start_time,
        startTime,
        default_duration_mins,
        defaultDurationMins,
        duration,
        meet_link,
        meetLink,
        batch_ids,
        batchIds
      } = req.body;

      const dateVal = interview_date || interviewDate;
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Mock interview title is required' });
      }

      if (!dateVal) {
        return res.status(400).json({ message: 'Interview date is required' });
      }

      const courseId = await resolveCourseId(req);
      if (!courseId) {
        return res.status(400).json({ message: 'Target course is required' });
      }

      const selectedBatches = batch_ids || batchIds || [];
      const createdBy = req.user?.id || null;

      const mockInterviewId = await MockInterview.create({
        title: title.trim(),
        description: description ? description.trim() : null,
        courseId,
        interviewDate: dateVal,
        startTime: start_time || startTime || '10:00:00',
        defaultDurationMins: parseInt(default_duration_mins || defaultDurationMins || duration, 10) || 20,
        meetLink: (meet_link || meetLink || '').trim() || null,
        batchIds: selectedBatches,
        createdBy
      });

      const event = await MockInterview.getById(mockInterviewId);

      return res.status(201).json({
        success: true,
        message: 'Mock interview event created successfully',
        data: event
      });
    } catch (err) {
      console.error('[MockInterviewController] create error:', err);
      return res.status(500).json({ message: err.message || 'Failed to create mock interview event' });
    }
  },

  /**
   * GET /api/mock-interviews
   * List all mock interviews for course or system
   */
  async getAllMockInterviews(req, res) {
    try {
      const courseId = await resolveCourseId(req);
      const { search, status } = req.query;

      const events = await MockInterview.getAll({
        courseId: (req.user?.role === 'super_admin' && !courseId) ? null : courseId,
        search,
        status
      });

      return res.json(events);
    } catch (err) {
      console.error('[MockInterviewController] getAll error:', err);
      return res.status(500).json({ message: 'Failed to fetch mock interviews' });
    }
  },

  /**
   * GET /api/mock-interviews/:id
   * Get single mock interview details
   */
  async getMockInterviewDetail(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid mock interview ID' });
      }

      const event = await MockInterview.getById(id);
      if (!event) {
        return res.status(404).json({ message: 'Mock interview not found' });
      }

      return res.json(event);
    } catch (err) {
      console.error('[MockInterviewController] getById error:', err);
      return res.status(500).json({ message: 'Failed to fetch mock interview detail' });
    }
  },

  /**
   * PUT /api/mock-interviews/:id
   * Update mock interview metadata & batches
   */
  async updateMockInterview(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid mock interview ID' });
      }

      const {
        title,
        description,
        interview_date,
        interviewDate,
        start_time,
        startTime,
        default_duration_mins,
        defaultDurationMins,
        duration,
        meet_link,
        meetLink,
        batch_ids,
        batchIds,
        whatsapp_template,
        whatsappTemplate,
        status
      } = req.body;

      const updated = await MockInterview.update(id, {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description.trim() : undefined,
        interviewDate: interview_date || interviewDate,
        startTime: start_time || startTime,
        defaultDurationMins: default_duration_mins || defaultDurationMins || duration ? parseInt(default_duration_mins || defaultDurationMins || duration, 10) : undefined,
        meetLink: meet_link !== undefined ? meet_link : (meetLink !== undefined ? meetLink : undefined),
        whatsappTemplate: whatsapp_template !== undefined ? whatsapp_template : whatsappTemplate,
        batchIds: batch_ids !== undefined ? batch_ids : (batchIds !== undefined ? batchIds : null),
        status
      });

      if (!updated) {
        return res.status(404).json({ message: 'Mock interview not found or not modified' });
      }

      const event = await MockInterview.getById(id);
      return res.json({
        success: true,
        message: 'Mock interview updated successfully',
        data: event
      });
    } catch (err) {
      console.error('[MockInterviewController] update error:', err);
      return res.status(500).json({ message: err.message || 'Failed to update mock interview' });
    }
  },

  /**
   * PATCH /api/mock-interviews/:id/meet-link
   * Dedicated fast update for Google Meet link
   */
  async updateMeetLink(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { meet_link, meetLink } = req.body;
      const link = meet_link !== undefined ? meet_link : meetLink;

      const updated = await MockInterview.updateMeetLink(id, link);
      if (!updated) {
        return res.status(404).json({ message: 'Mock interview not found' });
      }

      return res.json({
        success: true,
        message: 'Google Meet link updated successfully',
        meet_link: link
      });
    } catch (err) {
      console.error('[MockInterviewController] updateMeetLink error:', err);
      return res.status(500).json({ message: 'Failed to update Google Meet link' });
    }
  },

  /**
   * PATCH /api/mock-interviews/:id/whatsapp-template
   * Dedicated fast update for WhatsApp custom template
   */
  async updateWhatsAppTemplate(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { whatsapp_template, whatsappTemplate } = req.body;
      const template = whatsapp_template !== undefined ? whatsapp_template : whatsappTemplate;

      const updated = await MockInterview.updateWhatsAppTemplate(id, template);
      if (!updated) {
        return res.status(404).json({ message: 'Mock interview not found' });
      }

      return res.json({
        success: true,
        message: 'WhatsApp template updated successfully',
        whatsapp_template: template
      });
    } catch (err) {
      console.error('[MockInterviewController] updateWhatsAppTemplate error:', err);
      return res.status(500).json({ message: 'Failed to update WhatsApp template' });
    }
  },

  /**
   * DELETE /api/mock-interviews/:id
   */
  async deleteMockInterview(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await MockInterview.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Mock interview not found' });
      }
      return res.json({ success: true, message: 'Mock interview deleted successfully' });
    } catch (err) {
      console.error('[MockInterviewController] delete error:', err);
      return res.status(500).json({ message: 'Failed to delete mock interview' });
    }
  },

  /**
   * GET /api/mock-interviews/:id/students
   * Get student list for a mock interview
   */
  async getStudents(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { search, batch_id, batchId, status, view } = req.query;

      const isInterestedView = view === 'interested';
      const batchFilter = batch_id || batchId || '';

      const students = await MockInterview.getStudents(id, {
        search,
        batchFilter,
        statusFilter: status,
        isInterestedView
      });

      return res.json(students);
    } catch (err) {
      console.error('[MockInterviewController] getStudents error:', err);
      return res.status(500).json({ message: 'Failed to fetch participating students' });
    }
  },

  /**
   * POST /api/mock-interviews/:id/participants/:studentId/status
   * Change participation status (Interested, Not Interested with reason)
   */
  async updateParticipantStatus(req, res) {
    try {
      const mockId = parseInt(req.params.id, 10);
      const studentId = parseInt(req.params.studentId, 10);
      const { status, reason, feedback_notes, feedbackNotes } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      await MockInterview.updateParticipantStatus(mockId, studentId, {
        status: status.toUpperCase(),
        reason,
        feedbackNotes: feedback_notes || feedbackNotes
      });

      return res.json({
        success: true,
        message: `Student status updated to ${status}`
      });
    } catch (err) {
      console.error('[MockInterviewController] updateParticipantStatus error:', err);
      return res.status(500).json({ message: err.message || 'Failed to update student status' });
    }
  },

  /**
   * POST /api/mock-interviews/:id/generate-slots
   * Generate sequential interview slots for interested students
   */
  async generateSlots(req, res) {
    try {
      const mockId = parseInt(req.params.id, 10);
      const { start_time, startTime, duration_mins, durationMins } = req.body;

      const result = await MockInterview.generateSlots(mockId, {
        startTime: start_time || startTime || null,
        durationMins: duration_mins || durationMins || null
      });

      return res.json({
        success: true,
        message: `Generated interview slots for ${result.count} students`,
        data: result
      });
    } catch (err) {
      console.error('[MockInterviewController] generateSlots error:', err);
      return res.status(500).json({ message: err.message || 'Failed to generate interview slots' });
    }
  },

  /**
   * POST /api/mock-interviews/:id/participants/:studentId/start
   * Start interview (records actual start time)
   */
  async startInterview(req, res) {
    try {
      const mockId = parseInt(req.params.id, 10);
      const studentId = parseInt(req.params.studentId, 10);
      const { actual_start, actualStart } = req.body;

      await MockInterview.startInterview(mockId, studentId, {
        actualStart: actual_start || actualStart
      });

      return res.json({
        success: true,
        message: 'Interview marked as in-progress with start timestamp'
      });
    } catch (err) {
      console.error('[MockInterviewController] startInterview error:', err);
      return res.status(500).json({ message: 'Failed to record interview start' });
    }
  },

  /**
   * POST /api/mock-interviews/:id/participants/:studentId/complete
   * Mark interview completed (records actual start, end, duration)
   */
  async completeInterview(req, res) {
    try {
      const mockId = parseInt(req.params.id, 10);
      const studentId = parseInt(req.params.studentId, 10);
      const { actual_start, actualStart, actual_end, actualEnd, feedback_notes, feedbackNotes } = req.body;

      await MockInterview.completeInterview(mockId, studentId, {
        actualStart: actual_start || actualStart,
        actualEnd: actual_end || actualEnd,
        feedbackNotes: feedback_notes || feedbackNotes
      });

      return res.json({
        success: true,
        message: 'Interview marked as completed and timings recorded'
      });
    } catch (err) {
      console.error('[MockInterviewController] completeInterview error:', err);
      return res.status(500).json({ message: 'Failed to complete interview' });
    }
  }
};

module.exports = mockInterviewController;
