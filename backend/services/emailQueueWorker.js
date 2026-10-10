const nodemailer = require('nodemailer');
const db = require('../config/db');
const { decrypt } = require('../config/crypto');
const { getNextAvailableSmtpAccount } = require('./smtpService');
const { logAudit } = require('./auditService');
const { isHttpEmailConfigured, sendEmailViaHttp } = require('./httpEmailSender');

let isWorkerRunning = false;
let workerIntervalHandle = null;

/**
 * Standard Exam Email HTML Generator with Embedded Tracking Pixel
 */
function generateExamEmailHtml({ candidateName, batchName, examTitle, durationMinutes, totalMarks, otp, examUrl, trackingPixelUrl = '' }) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 24px; color: white;">
        <h1 style="margin: 0; font-size: 22px;">Written Examination Management Portal</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Assessment Notification & Access Passcode</p>
      </div>
      
      <div style="padding: 24px; background-color: #ffffff;">
        <p style="font-size: 16px;">Dear <strong>${candidateName}</strong>,</p>
        <p>You have been registered to take the following written examination:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-weight: bold; width: 35%; border: 1px solid #e2e8f0;">Examination</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${examTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0;">Batch</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${batchName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0;">Duration</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${durationMinutes} Minutes</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0;">Total Marks</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${totalMarks}</td>
          </tr>
        </table>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e40af;">YOUR EXAM ACCESS PASSCODE (OTP):</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a; font-family: monospace;">
            ${otp}
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">This OTP is unique to your candidate account. Do not share it with others.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${examUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
            Proceed to Examination Portal
          </a>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">Exam URL: ${examUrl}</p>
        </div>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; font-size: 13px; color: #991b1b; margin-top: 20px;">
          <strong>Important Security & Conduct Rules:</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 20px;">
            <li>The examination must be taken in Fullscreen Mode on a desktop or laptop browser.</li>
            <li>Exiting fullscreen, switching tabs, or minimizing the window will log a security warning.</li>
            <li>A maximum of <strong>3 violations</strong> is permitted before your exam is automatically submitted.</li>
            <li>Answers are autosaved continuously in your browser and synchronized to the server.</li>
          </ul>
        </div>
      </div>

      <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
        &copy; ${new Date().getFullYear()} Examination Evaluation System. All rights reserved.
      </div>
      ${trackingPixelUrl ? `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />` : ''}
    </div>
  `;
}

/**
 * Queue invitation emails for all candidates of an exam assignment
 */
async function queueExamEmails(assignmentId, frontendBaseUrl = 'https://project-lms-six.vercel.app', apiBaseUrl = null, userId = null) {
  // Fetch assignment & candidates with their OTPs
  const [assignmentRows] = await db.query(`
    SELECT ea.*, p.title as paper_title, b.name as batch_name
    FROM exam_assignments ea
    JOIN exam_paper_versions pv ON ea.paper_version_id = pv.id
    JOIN exam_papers p ON pv.paper_id = p.id
    JOIN Batches b ON ea.batch_id = b.id
    WHERE ea.id = ?
  `, [assignmentId]);

  if (assignmentRows.length === 0) throw new Error('Assignment not found.');
  const assignment = assignmentRows[0];

  const [candidates] = await db.query(`
    SELECT eac.*, eo.encrypted_otp, eo.otp_iv, eo.otp_tag
    FROM exam_assignment_candidates eac
    LEFT JOIN exam_otps eo ON eo.candidate_id = eac.id
    WHERE eac.assignment_id = ?
  `, [assignmentId]);

  let queuedCount = 0;

  for (const c of candidates) {
    // Check if already queued or sent
    const [existing] = await db.query(`
      SELECT id, status FROM email_jobs WHERE candidate_id = ? AND assignment_id = ? AND status IN ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'OPENED')
    `, [c.id, assignmentId]);

    if (existing.length > 0) continue;

    let candidateOtp = '------';
    if (c.encrypted_otp && c.otp_iv && c.otp_tag) {
      try {
        candidateOtp = decrypt(c.encrypted_otp, c.otp_iv, c.otp_tag);
      } catch (err) {
        console.warn(`Failed decrypting OTP for candidate ${c.id}:`, err.message);
      }
    }

    const examUrl = `${frontendBaseUrl.replace(/\/$/, '')}/exam/${assignment.assignment_code}`;
    const subject = `Official Examination Invitation: ${assignment.title} [Batch ${c.snapshot_batch_name}]`;

    // 1. Insert preliminary job to obtain jobId for tracking pixel
    const [insertResult] = await db.query(`
      INSERT INTO email_jobs 
        (candidate_id, assignment_id, recipient_email, recipient_name, subject, body_html, status, attempt_count, max_attempts)
      VALUES (?, ?, ?, ?, ?, '', 'QUEUED', 0, 3)
    `, [c.id, assignmentId, c.snapshot_student_email, c.snapshot_student_name, subject]);

    const jobId = insertResult.insertId;
    const trackingPixelUrl = `${(apiBaseUrl || frontendBaseUrl).replace(/\/$/, '')}/api/exams/track-mail/${jobId}`;

    const htmlBody = generateExamEmailHtml({
      candidateName: c.snapshot_student_name,
      batchName: c.snapshot_batch_name,
      examTitle: assignment.title,
      durationMinutes: assignment.duration_minutes,
      totalMarks: assignment.total_marks,
      otp: candidateOtp,
      examUrl,
      trackingPixelUrl
    });

    await db.query(`UPDATE email_jobs SET body_html = ? WHERE id = ?`, [htmlBody, jobId]);
    queuedCount++;
  }

  // Update candidate status to INVITED
  await db.query(`
    UPDATE exam_assignment_candidates 
    SET status = 'INVITED', invited_at = NOW() 
    WHERE assignment_id = ? AND status = 'ASSIGNED'
  `, [assignmentId]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'EMAIL_JOBS_QUEUED',
    entityType: 'EXAM_ASSIGNMENT',
    entityId: assignmentId,
    payload: { queuedCount }
  });

  // Prompt the email worker immediately
  setImmediate(() => {
    processNextEmailJob().catch(e => console.warn('Instant email queue poller:', e.message));
  });

  return { queuedCount };
}

/**
 * Queue or resend an invitation email for a single candidate specifically
 */
async function queueCandidateEmail(candidateId, frontendBaseUrl = 'https://project-lms-six.vercel.app', apiBaseUrl = null, userId = null) {
  const [candidates] = await db.query(`
    SELECT eac.*, ea.assignment_code, ea.title as assignment_title, ea.duration_minutes, ea.total_marks,
           eo.encrypted_otp, eo.otp_iv, eo.otp_tag
    FROM exam_assignment_candidates eac
    JOIN exam_assignments ea ON eac.assignment_id = ea.id
    LEFT JOIN exam_otps eo ON eo.candidate_id = eac.id
    WHERE eac.id = ?
  `, [candidateId]);

  if (candidates.length === 0) throw new Error('Candidate not found.');
  const c = candidates[0];

  let candidateOtp = '------';
  if (c.encrypted_otp && c.otp_iv && c.otp_tag) {
    try {
      candidateOtp = decrypt(c.encrypted_otp, c.otp_iv, c.otp_tag);
    } catch (err) {
      console.warn(`Failed decrypting OTP for candidate ${c.id}:`, err.message);
    }
  }

  const examUrl = `${frontendBaseUrl.replace(/\/$/, '')}/exam/${c.assignment_code}`;
  const subject = `Official Examination Invitation: ${c.assignment_title} [Batch ${c.snapshot_batch_name}]`;

  // Insert fresh email job for candidate
  const [insertResult] = await db.query(`
    INSERT INTO email_jobs 
      (candidate_id, assignment_id, recipient_email, recipient_name, subject, body_html, status, attempt_count, max_attempts)
    VALUES (?, ?, ?, ?, ?, '', 'QUEUED', 0, 3)
  `, [c.id, c.assignment_id, c.snapshot_student_email, c.snapshot_student_name, subject]);

  const jobId = insertResult.insertId;
  const trackingPixelUrl = `${(apiBaseUrl || frontendBaseUrl).replace(/\/$/, '')}/api/exams/track-mail/${jobId}`;

  const htmlBody = generateExamEmailHtml({
    candidateName: c.snapshot_student_name,
    batchName: c.snapshot_batch_name,
    examTitle: c.assignment_title,
    durationMinutes: c.duration_minutes,
    totalMarks: c.total_marks,
    otp: candidateOtp,
    examUrl,
    trackingPixelUrl
  });

  await db.query(`UPDATE email_jobs SET body_html = ? WHERE id = ?`, [htmlBody, jobId]);

  // Update candidate status to INVITED if still ASSIGNED
  await db.query(`
    UPDATE exam_assignment_candidates 
    SET status = CASE WHEN status = 'ASSIGNED' THEN 'INVITED' ELSE status END,
        invited_at = COALESCE(invited_at, NOW()) 
    WHERE id = ?
  `, [c.id]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'CANDIDATE_EMAIL_QUEUED',
    entityType: 'EXAM_ASSIGNMENT_CANDIDATE',
    entityId: c.id,
    payload: { recipientEmail: c.snapshot_student_email, jobId }
  });

  // Prompt the email worker immediately
  setImmediate(() => {
    processNextEmailJob().catch(e => console.warn('Instant candidate email dispatch:', e.message));
  });

  return {
    success: true,
    jobId,
    candidateName: c.snapshot_student_name,
    recipientEmail: c.snapshot_student_email,
    message: `Invitation email queued successfully for ${c.snapshot_student_name}`
  };
}

/**
 * Track email open event via invisible tracking pixel
 */
async function trackEmailOpen(jobId) {
  if (!jobId) return;
  try {
    const [jobs] = await db.query(`SELECT id, status, opened_at FROM email_jobs WHERE id = ?`, [jobId]);
    if (jobs.length > 0) {
      await db.query(`
        UPDATE email_jobs 
        SET status = 'OPENED', opened_at = COALESCE(opened_at, NOW()) 
        WHERE id = ?
      `, [jobId]);
      console.log(`[EMAIL TRACKER] Job #${jobId} confirmed opened by student.`);
    }
  } catch (err) {
    console.warn('[EMAIL TRACKER ERROR]', err.message);
  }
}

// Pooled Nodemailer transporters map: `${smtpId}_${host}_${port}_${secure}` => Transporter
const transporterPool = new Map();

function getPooledTransporter(smtpAcc, plainPassword, host, port, secure) {
  const poolKey = `${smtpAcc.id}_${host}_${port}_${secure}_${smtpAcc.username}`;
  let transporter = transporterPool.get(poolKey);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      rateLimit: 14,
      host,
      port,
      secure,
      family: 4, // Force IPv4 to avoid ENETUNREACH on hosting environments
      auth: {
        user: smtpAcc.username,
        pass: plainPassword
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });
    transporterPool.set(poolKey, transporter);
  }
  return transporter;
}

function invalidateTransporterPool(accountId = null) {
  if (accountId) {
    for (const [key, tr] of transporterPool.entries()) {
      if (key.startsWith(`${accountId}_`)) {
        try { tr.close(); } catch (e) {}
        transporterPool.delete(key);
      }
    }
  } else {
    for (const [, tr] of transporterPool.entries()) {
      try { tr.close(); } catch (e) {}
    }
    transporterPool.clear();
  }
}

async function executeSingleJob(job) {
  // 1. Select available healthy SMTP account with quota
  const smtpAcc = await getNextAvailableSmtpAccount();

  if (!smtpAcc) {
    console.warn('[EMAIL WORKER] No available healthy SMTP accounts with remaining quota. Postponing job ID:', job.id);
    await db.query(`
      UPDATE email_jobs 
      SET status = 'RETRY_PENDING', scheduled_for = DATE_ADD(NOW(), INTERVAL 5 MINUTE), last_error = 'All SMTP accounts exceeded quota or unhealthy'
      WHERE id = ?
    `, [job.id]);
    return false;
  }

  // 2. Prepare transporter using connection pooling for 10x-20x throughput
  const plainPassword = decrypt(smtpAcc.encrypted_password, smtpAcc.iv, smtpAcc.auth_tag).replace(/\s+/g, '');
  const isPrimarySecure = smtpAcc.secure_type === 'SSL' || smtpAcc.port === 465;
  let transporter = getPooledTransporter(smtpAcc, plainPassword, smtpAcc.host, smtpAcc.port, isPrimarySecure);

  const startTime = Date.now();
  let sendSuccess = false;
  let responseMessage = '';
  let errorMessage = '';

  try {
    // Re-hydrate OTP placeholder if needed
    let finalHtml = job.body_html;
    if (finalHtml.includes('[REVERT_OTP]')) {
      let decOtp = '------';
      if (job.encrypted_otp && job.otp_iv && job.otp_tag) {
        try {
          decOtp = decrypt(job.encrypted_otp, job.otp_iv, job.otp_tag);
        } catch (e) {
          console.warn('Failed decrypting OTP for queued job:', e.message);
        }
      }
      finalHtml = finalHtml.replace(/\[REVERT_OTP\]/g, decOtp);
    }

    // A. If configured as an HTTPS email service (Resend, Brevo, SendGrid), send over HTTPS (port 443)
    if (smtpAcc.secure_type === 'HTTPS' || isHttpEmailConfigured({ ...smtpAcc, plainPassword })) {
      try {
        const httpRes = await sendEmailViaHttp({
          smtpAcc,
          plainPassword,
          toEmail: job.recipient_email,
          toName: job.recipient_name,
          subject: job.subject,
          html: finalHtml
        });
        sendSuccess = true;
        responseMessage = httpRes.response;
      } catch (httpErr) {
        sendSuccess = false;
        errorMessage = httpErr.message;
      }
    } else {
      // B. Standard pooled SMTP delivery with fallback port and Render HTTP API fallback
      try {
        const info = await transporter.sendMail({
          from: `"${smtpAcc.display_name}" <${smtpAcc.sender_email}>`,
          to: `"${job.recipient_name}" <${job.recipient_email}>`,
          subject: job.subject,
          html: finalHtml
        });

        sendSuccess = true;
        responseMessage = info.response || 'Message delivered successfully';
      } catch (primarySendErr) {
        // If connection timed out or socket error, attempt alternate port fallback
        const isNetworkOrTimeout = /timeout|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ENETUNREACH/i.test(primarySendErr.message);
        if (isNetworkOrTimeout && (smtpAcc.port === 465 || smtpAcc.port === 587)) {
          const altPort = smtpAcc.port === 465 ? 587 : 465;
          const altSecure = altPort === 465;
          console.warn(`[EMAIL WORKER] Primary port ${smtpAcc.port} failed for job #${job.id}. Retrying on fallback port ${altPort}...`);
          try {
            const altTransporter = getPooledTransporter(smtpAcc, plainPassword, smtpAcc.host, altPort, altSecure);
            const info = await altTransporter.sendMail({
              from: `"${smtpAcc.display_name}" <${smtpAcc.sender_email}>`,
              to: `"${job.recipient_name}" <${job.recipient_email}>`,
              subject: job.subject,
              html: finalHtml
            });
            sendSuccess = true;
            responseMessage = (info.response || 'Delivered') + ` (via fallback port ${altPort})`;

            // Save working port so next emails don't hit the timeout
            await db.query(`UPDATE smtp_accounts SET port = ?, secure_type = ? WHERE id = ?`, [altPort, altSecure ? 'SSL' : 'STARTTLS', smtpAcc.id]);
          } catch (altErr) {
            // Check if HTTP email API fallback is available in environment
            if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY) {
              console.log(`[EMAIL WORKER] SMTP ports blocked on hosting network (Render). Auto-switching to HTTPS API fallback for job #${job.id}...`);
              try {
                const httpRes = await sendEmailViaHttp({
                  smtpAcc,
                  plainPassword,
                  toEmail: job.recipient_email,
                  toName: job.recipient_name,
                  subject: job.subject,
                  html: finalHtml
                });
                sendSuccess = true;
                responseMessage = httpRes.response + ' (Auto-switched to HTTPS on Render)';
              } catch (httpFallbackErr) {
                sendSuccess = false;
                errorMessage = `SMTP timeout (${altErr.message}) & HTTPS fallback failed: ${httpFallbackErr.message}`;
              }
            } else {
              sendSuccess = false;
              errorMessage = altErr.message;
            }
          }
        } else {
          sendSuccess = false;
          errorMessage = primarySendErr.message;
        }
      }
    }
  } catch (sendErr) {
    sendSuccess = false;
    errorMessage = sendErr.message;
  }

  const latencyMs = Date.now() - startTime;

  // 3. Update status and quotas
  if (sendSuccess) {
    await db.query(`
      UPDATE email_jobs 
      SET status = 'SENT', smtp_account_id = ?, sent_at = NOW(), last_error = NULL
      WHERE id = ?
    `, [smtpAcc.id, job.id]);

    await db.query(`
      UPDATE smtp_accounts 
      SET sent_today = sent_today + 1, consecutive_failures = 0
      WHERE id = ?
    `, [smtpAcc.id]);

    await db.query(`
      INSERT INTO email_delivery_logs 
        (job_id, smtp_account_id, attempt_number, status, response_message, latency_ms)
      VALUES (?, ?, ?, 'SUCCESS', ?, ?)
    `, [job.id, smtpAcc.id, job.attempt_count + 1, responseMessage, latencyMs]);

    console.log(`[EMAIL WORKER] Job #${job.id} sent to ${job.recipient_email} via ${smtpAcc.sender_email} (${latencyMs}ms)`);
  } else {
    const nextAttempt = job.attempt_count + 1;
    const isFinalFail = nextAttempt >= job.max_attempts;
    const newStatus = isFinalFail ? 'FAILED' : 'RETRY_PENDING';
    const retryDelayMinutes = nextAttempt * 2; // Exponential backoff: 2m, 4m, etc.

    await db.query(`
      UPDATE email_jobs 
      SET status = ?, 
          attempt_count = ?, 
          last_error = ?,
          scheduled_for = DATE_ADD(NOW(), INTERVAL ? MINUTE)
      WHERE id = ?
    `, [newStatus, nextAttempt, errorMessage, retryDelayMinutes, job.id]);

    await db.query(`
      UPDATE smtp_accounts 
      SET consecutive_failures = consecutive_failures + 1,
          is_healthy = CASE WHEN consecutive_failures >= 3 THEN 0 ELSE is_healthy END,
          last_error_message = ?
      WHERE id = ?
    `, [errorMessage, smtpAcc.id]);

    await db.query(`
      INSERT INTO email_delivery_logs 
        (job_id, smtp_account_id, attempt_number, status, response_message, latency_ms)
      VALUES (?, ?, ?, 'FAILED', ?, ?)
    `, [job.id, smtpAcc.id, nextAttempt, errorMessage, latencyMs]);

    console.error(`[EMAIL WORKER] Job #${job.id} failed on attempt ${nextAttempt}: ${errorMessage}`);
  }

  return sendSuccess;
}

/**
 * Process a concurrent batch of email jobs for maximum efficiency
 */
async function processEmailBatch(batchSize = 3) {
  // 1. Fetch next batch of queued or retryable jobs
  const [jobs] = await db.query(`
    SELECT ej.*, eo.encrypted_otp, eo.otp_iv, eo.otp_tag, eo.candidate_id as eo_cid
    FROM email_jobs ej
    LEFT JOIN exam_otps eo ON eo.candidate_id = ej.candidate_id
    WHERE ej.status IN ('QUEUED', 'RETRY_PENDING')
      AND ej.scheduled_for <= NOW()
    ORDER BY ej.id ASC
    LIMIT ?
  `, [batchSize]);

  if (jobs.length === 0) {
    return 0;
  }

  // Atomically mark batch as PROCESSING to prevent duplicate pickup
  const jobIds = jobs.map(j => j.id);
  await db.query(`UPDATE email_jobs SET status = 'PROCESSING' WHERE id IN (?)`, [jobIds]);

  // Execute in parallel
  await Promise.allSettled(jobs.map(job => executeSingleJob(job)));

  return jobs.length;
}

/**
 * Worker tick: continuously processes queued email jobs until queue is empty
 */
async function processNextEmailJob() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    while (true) {
      const processedCount = await processEmailBatch(3);
      if (processedCount === 0) break;
      // Brief 50ms pause between batches
      await new Promise(r => setTimeout(r, 50));
    }
  } catch (err) {
    console.error('[EMAIL WORKER ERROR]', err.message);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Start background queue poller
 */
function startEmailWorker(intervalMs = 3000) {
  if (workerIntervalHandle) clearInterval(workerIntervalHandle);
  workerIntervalHandle = setInterval(processNextEmailJob, intervalMs);
  console.log(`[EMAIL WORKER] High-efficiency pooled email worker started (interval: ${intervalMs}ms).`);
}

/**
 * List email queue jobs for admin monitoring
 */
async function getEmailQueueStatus({ status = null, assignmentId = null, limit = 50, offset = 0 } = {}) {
  let sql = `
    SELECT 
      ej.*,
      sa.sender_email as smtp_sender,
      ea.title as exam_title
    FROM email_jobs ej
    LEFT JOIN smtp_accounts sa ON ej.smtp_account_id = sa.id
    LEFT JOIN exam_assignments ea ON ej.assignment_id = ea.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND ej.status = ?';
    params.push(status);
  }
  if (assignmentId) {
    sql += ' AND ej.assignment_id = ?';
    params.push(assignmentId);
  }

  sql += ' ORDER BY ej.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await db.query(sql, params);

  const [counts] = await db.query(`
    SELECT status, COUNT(*) as count 
    FROM email_jobs 
    GROUP BY status
  `);

  const statsObj = {
    QUEUED: 0,
    PROCESSING: 0,
    SENT: 0,
    DELIVERED: 0,
    OPENED: 0,
    FAILED: 0,
    RETRY_PENDING: 0
  };
  for (const r of counts) {
    statsObj[r.status] = parseInt(r.count, 10);
  }

  return { jobs: rows, recentJobs: rows, stats: statsObj };
}

/**
 * Retry failed email jobs manually
 */
async function retryFailedJobs(jobIds = []) {
  let result;
  if (jobIds.length > 0) {
    [result] = await db.query(`
      UPDATE email_jobs 
      SET status = 'QUEUED', attempt_count = 0, scheduled_for = NOW(), last_error = NULL
      WHERE id IN (?)
    `, [jobIds]);
  } else {
    [result] = await db.query(`
      UPDATE email_jobs 
      SET status = 'QUEUED', attempt_count = 0, scheduled_for = NOW(), last_error = NULL
      WHERE status IN ('FAILED', 'RETRY_PENDING')
    `);
  }

  // Trigger processing immediately in background
  setTimeout(() => {
    processNextEmailJob().catch(e => console.warn('[EMAIL WORKER] Immediate retry tick error:', e.message));
  }, 100);

  return { success: true, requeuedCount: result.affectedRows || 0 };
}

module.exports = {
  queueExamEmails,
  queueCandidateEmail,
  trackEmailOpen,
  processNextEmailJob,
  startEmailWorker,
  getEmailQueueStatus,
  retryFailedJobs,
  invalidateTransporterPool
};
