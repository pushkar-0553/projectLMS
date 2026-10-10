const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const isCoordinatorOrAdmin = authorize('admin', 'coordinator', 'super_admin', 'faculty');

const paperController = require('../controllers/exams/paperController');
const questionBankController = require('../controllers/exams/questionBankController');
const stageDbController = require('../controllers/exams/stageDbController');
const assignmentController = require('../controllers/exams/assignmentController');
const smtpController = require('../controllers/exams/smtpController');
const emailQueueController = require('../controllers/exams/emailQueueController');
const studentExamController = require('../controllers/exams/studentExamController');
const evaluationController = require('../controllers/exams/evaluationController');
const reportController = require('../controllers/exams/reportController');
const auditController = require('../controllers/exams/auditController');
const db = require('../config/db');
const { decrypt } = require('../config/crypto');

// 1. Paper Management Routes
router.get('/papers', protect, isCoordinatorOrAdmin, paperController.listPapers);
router.post('/papers', protect, isCoordinatorOrAdmin, paperController.createPaper);
router.get('/papers/:id', protect, isCoordinatorOrAdmin, paperController.getPaperById);
router.get('/papers/versions/:versionId', protect, isCoordinatorOrAdmin, paperController.getVersionDetails);
router.post('/papers/:id/version', protect, isCoordinatorOrAdmin, paperController.createNewVersion);
router.post('/papers/versions/:versionId/publish', protect, isCoordinatorOrAdmin, paperController.publishVersion);
router.get('/papers/versions/:versionId/preview', paperController.previewHTML);
router.get('/papers/versions/:versionId/answer-key-html', protect, isCoordinatorOrAdmin, paperController.previewAnswerKeyHTML);
router.get('/papers/versions/:versionId/download-pdf', paperController.downloadPDF);
router.get('/papers/versions/:versionId/download-docx', paperController.downloadDOCX);

// 2. Question Bank Routes
router.get('/question-bank/categories', protect, isCoordinatorOrAdmin, questionBankController.listCategories);
router.post('/question-bank/categories', protect, isCoordinatorOrAdmin, questionBankController.createCategory);
router.get('/question-bank/questions', protect, isCoordinatorOrAdmin, questionBankController.listQuestions);
router.post('/question-bank/questions', protect, isCoordinatorOrAdmin, questionBankController.createQuestion);

// 3. Stage DB Integration Routes (Batches, Students, Courses)
router.get('/stage/batches', protect, isCoordinatorOrAdmin, stageDbController.listBatches);
router.get('/stage/batches/:batchId/students', protect, isCoordinatorOrAdmin, stageDbController.listStudentsByBatch);
router.get('/stage/courses', protect, isCoordinatorOrAdmin, stageDbController.listCourses);

// 4. Exam Assignment Routes
router.get('/assignments', protect, isCoordinatorOrAdmin, assignmentController.listAssignments);
router.post('/assignments', protect, isCoordinatorOrAdmin, assignmentController.createAssignment);
router.get('/assignments/:id', protect, isCoordinatorOrAdmin, assignmentController.getAssignmentById);
router.patch('/assignments/:id/status', protect, isCoordinatorOrAdmin, assignmentController.updateAssignmentStatus);

// 5. SMTP Management Routes
router.get('/smtp', protect, isCoordinatorOrAdmin, smtpController.listSmtpAccounts);
router.post('/smtp', protect, isCoordinatorOrAdmin, smtpController.createSmtpAccount);
router.post('/smtp/:id/test', protect, isCoordinatorOrAdmin, smtpController.testSmtpConnection);
router.patch('/smtp/:id', protect, isCoordinatorOrAdmin, smtpController.updateSmtpAccount);
router.put('/smtp/:id', protect, isCoordinatorOrAdmin, smtpController.updateSmtpAccount);
router.delete('/smtp/:id', protect, isCoordinatorOrAdmin, smtpController.deleteSmtpAccount);

// 6. Email Queue Routes
router.get('/email-queue', protect, isCoordinatorOrAdmin, emailQueueController.getEmailQueueStatus);
router.post('/email-queue/send-exam/:assignmentId', protect, isCoordinatorOrAdmin, emailQueueController.queueExamEmails);
router.post('/email-queue/send-candidate/:candidateId', protect, isCoordinatorOrAdmin, emailQueueController.queueCandidateEmail);
router.post('/email-queue/retry', protect, isCoordinatorOrAdmin, emailQueueController.retryFailedJobs);
router.get('/track-mail/:jobId', emailQueueController.trackEmailOpen);

// 7. Public Student Exam Routes (Passcode/Session Secured)
router.post('/student-exam/verify-otp', studentExamController.verifyOtp);
router.post('/student-exam/sync-answers', studentExamController.syncAnswers);
router.post('/student-exam/violation', studentExamController.reportViolation);
router.post('/student-exam/submit', studentExamController.submitExam);

// 8. Evaluation Routes
router.get('/evaluation/candidates/:candidateId', protect, isCoordinatorOrAdmin, evaluationController.getCandidateSubmission);
router.post('/evaluation/questions', protect, isCoordinatorOrAdmin, evaluationController.saveQuestionEvaluation);
router.post('/evaluation/candidates/:candidateId/finalize', protect, isCoordinatorOrAdmin, evaluationController.finalizeCandidateResult);
router.post('/evaluation/assignments/:assignmentId/publish', protect, isCoordinatorOrAdmin, evaluationController.publishAssignmentResults);

// 9. Reports Routes
router.get('/reports/assignments/:assignmentId', protect, isCoordinatorOrAdmin, reportController.getExamAssignmentReport);
router.get('/reports/assignments/:assignmentId/csv', protect, isCoordinatorOrAdmin, reportController.downloadExamCSV);
router.get('/reports/security-violations', protect, isCoordinatorOrAdmin, reportController.getSecurityViolationReport);

// 10. Audit Logs Routes
router.get('/audit-logs', protect, isCoordinatorOrAdmin, auditController.getAuditLogs);

// 11. Student Portal: Fetch active, upcoming, and past exams for currently logged-in student
router.get('/student/my-exams', protect, async (req, res) => {
  try {
    const studentId = req.user.id;
    const [rows] = await db.query(`
      SELECT 
        ea.id,
        ea.assignment_code,
        ea.title,
        ea.instructions,
        ea.duration_minutes,
        ea.total_marks,
        ea.pass_marks,
        ea.status as assignment_status,
        ea.scheduled_start,
        ea.scheduled_end,
        b.id as batch_id,
        b.name as batch_name,
        eac.id as candidate_id,
        COALESCE(eac.status, 'ASSIGNED') as candidate_status,
        p.title as paper_title,
        p.subject,
        er.total_marks_awarded,
        er.percentage,
        er.is_passed,
        er.status as result_status,
        eo.encrypted_otp,
        eo.otp_iv,
        eo.otp_tag
      FROM exam_assignments ea
      JOIN exam_paper_versions pv ON ea.paper_version_id = pv.id
      JOIN exam_papers p ON pv.paper_id = p.id
      JOIN Batches b ON ea.batch_id = b.id
      JOIN StudentBatchMap sbm ON sbm.batch_id = b.id AND sbm.student_id = ?
      LEFT JOIN exam_assignment_candidates eac ON eac.assignment_id = ea.id AND eac.student_id = ?
      LEFT JOIN exam_results er ON er.candidate_id = eac.id
      LEFT JOIN exam_otps eo ON eo.candidate_id = eac.id
      ORDER BY ea.scheduled_start ASC, ea.id DESC
    `, [studentId, studentId]);

    const now = new Date();
    let totalAssigned = rows.length;
    let attendedCount = 0;
    let evaluatedCount = 0;
    let totalScoreSum = 0;
    let upcomingExam = null;

    const mappedExams = rows.map(row => {
      let otpCode = null;
      if (row.encrypted_otp && row.otp_iv && row.otp_tag) {
        try {
          otpCode = decrypt(row.encrypted_otp, row.otp_iv, row.otp_tag);
        } catch (e) {
          // Decryption fallback
        }
      }

      const isAttended = ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'].includes(row.candidate_status);
      if (isAttended) attendedCount++;

      const isEvaluated = row.candidate_status === 'EVALUATED' || row.result_status === 'PUBLISHED';
      if (isEvaluated && row.percentage !== null) {
        evaluatedCount++;
        totalScoreSum += parseFloat(row.percentage || 0);
      }

      const startTime = row.scheduled_start ? new Date(row.scheduled_start) : null;
      const endTime = row.scheduled_end ? new Date(row.scheduled_end) : null;

      // Determine if this is an upcoming or live exam
      const isPending = !isAttended;
      if (isPending && !upcomingExam) {
        upcomingExam = {
          id: row.id,
          assignment_code: row.assignment_code,
          title: row.title,
          subject: row.subject,
          duration_minutes: row.duration_minutes,
          total_marks: row.total_marks,
          scheduled_start: row.scheduled_start,
          scheduled_end: row.scheduled_end,
          candidate_status: row.candidate_status,
          otp_code: otpCode,
          isLiveNow: startTime && startTime <= now && (!endTime || endTime >= now),
          startsInSeconds: startTime ? Math.max(0, Math.floor((startTime - now) / 1000)) : 0
        };
      }

      return {
        id: row.id,
        assignment_code: row.assignment_code,
        title: row.title,
        paper_title: row.paper_title,
        subject: row.subject,
        duration_minutes: row.duration_minutes,
        total_marks: row.total_marks,
        pass_marks: row.pass_marks,
        assignment_status: row.assignment_status,
        scheduled_start: row.scheduled_start,
        scheduled_end: row.scheduled_end,
        batch_name: row.batch_name,
        candidate_id: row.candidate_id,
        candidate_status: row.candidate_status,
        otp_code: otpCode,
        is_attended: isAttended,
        is_evaluated: isEvaluated,
        result: row.percentage !== null ? {
          total_marks_awarded: row.total_marks_awarded,
          percentage: row.percentage,
          is_passed: Boolean(row.is_passed),
          status: row.result_status
        } : null
      };
    });

    const averageScore = evaluatedCount > 0 ? (totalScoreSum / evaluatedCount).toFixed(1) : null;

    res.json({
      success: true,
      data: {
        exams: mappedExams,
        summary: {
          total_assigned: totalAssigned,
          attended_count: attendedCount,
          evaluated_count: evaluatedCount,
          average_score: averageScore,
          upcoming_exam: upcomingExam
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
