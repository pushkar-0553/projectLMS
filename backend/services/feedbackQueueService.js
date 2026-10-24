const pool = require('../config/db');
const Feedback = require('../models/feedbackModel');
let io = null;

try {
  const socketModule = require('../socket');
  if (socketModule && socketModule.getIO) {
    // Lazy retrieve io when available
    io = socketModule;
  }
} catch {
  // Socket optional fallback
}

class FeedbackSubmissionQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.concurrency = 5; // Max simultaneous database workers
    this.activeWorkers = 0;
    this.metrics = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0
    };
  }

  /**
   * Enqueue a new student feedback submission
   * Returns immediately so caller gets instant response (< 50ms)
   */
  async enqueue(job) {
    this.metrics.totalEnqueued++;
    const jobWrapper = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      enqueuedAt: new Date(),
      retries: 0
    };

    this.queue.push(jobWrapper);
    console.log(`[FeedbackQueue] Enqueued submission for student ${job.studentId} on campaign ${job.feedbackId}. Queue size: ${this.queue.length}`);

    // Trigger queue processing in next event-loop tick
    setImmediate(() => this.processNext());

    return {
      jobId: jobWrapper.id,
      queued: true
    };
  }

  /**
   * Process next jobs up to concurrency limit
   */
  async processNext() {
    if (this.queue.length === 0 || this.activeWorkers >= this.concurrency) {
      return;
    }

    while (this.queue.length > 0 && this.activeWorkers < this.concurrency) {
      const job = this.queue.shift();
      this.activeWorkers++;
      this.executeJob(job).finally(() => {
        this.activeWorkers--;
        this.processNext();
      });
    }
  }

  /**
   * Executes a single submission job safely with transactions and socket emission
   */
  async executeJob(job) {
    const { feedbackId, studentId, batchId, overallFeedback, answers, token } = job;
    console.log(`[FeedbackQueue] Processing job ${job.id} for student ${studentId}...`);

    try {
      // 1. Submit response & answers into feedback_responses and feedback_answers
      const responseId = await Feedback.submitResponse({
        feedbackId,
        studentId,
        batchId,
        overallFeedback,
        answers,
        submittedBy: null // Self-submitted via unique link
      });

      // 2. Mark student link status as SUBMITTED
      if (token) {
        await pool.execute(
          `UPDATE feedback_student_links 
           SET status = 'SUBMITTED', submitted_at = NOW() 
           WHERE token = ?`,
          [token]
        );
      } else {
        await pool.execute(
          `UPDATE feedback_student_links 
           SET status = 'SUBMITTED', submitted_at = NOW() 
           WHERE feedback_id = ? AND student_id = ?`,
          [feedbackId, studentId]
        );
      }

      this.metrics.totalProcessed++;
      console.log(`[FeedbackQueue] Successfully processed job ${job.id}. Response ID: ${responseId}`);

      // 3. Emit real-time notification to coordinators & admins
      try {
        const socket = io?.getIO?.();
        if (socket) {
          socket.to('role:coordinator').emit('feedback-submission-received', {
            feedbackId,
            studentId,
            responseId,
            submittedAt: new Date()
          });
          socket.to('role:admin').emit('feedback-submission-received', {
            feedbackId,
            studentId,
            responseId,
            submittedAt: new Date()
          });
        }
      } catch (sockErr) {
        // Non-blocking socket emission
      }
    } catch (err) {
      console.error(`[FeedbackQueue] Error processing job ${job.id}:`, err);
      job.retries = (job.retries || 0) + 1;

      if (job.retries <= 3) {
        console.warn(`[FeedbackQueue] Retrying job ${job.id} (attempt ${job.retries}/3) in 1s...`);
        setTimeout(() => {
          this.queue.push(job);
          this.processNext();
        }, 1000);
      } else {
        this.metrics.totalFailed++;
        console.error(`[FeedbackQueue] Job ${job.id} permanently failed after 3 retries.`);
      }
    }
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeWorkers: this.activeWorkers,
      ...this.metrics
    };
  }
}

const feedbackQueueService = new FeedbackSubmissionQueue();
module.exports = feedbackQueueService;
