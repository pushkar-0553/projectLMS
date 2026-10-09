const db = require('../config/db');
const { generateSecureOTP, hashOTP, generateSalt, encrypt } = require('../config/crypto');

/**
 * Get all existing batches from Stage DB Batches table (with optional course filtering)
 */
async function getBatches({ courseId = null, courseSlug = null } = {}) {
  let sql = `
    SELECT 
      b.id,
      b.name,
      b.course_id,
      c.name as course_name,
      c.code as course_code,
      c.slug as course_slug,
      b.description,
      b.is_active,
      b.start_date,
      b.end_date,
      b.created_at,
      (SELECT COUNT(*) FROM StudentBatchMap sbm WHERE sbm.batch_id = b.id) as student_count
    FROM Batches b
    LEFT JOIN Courses c ON b.course_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (courseId) {
    sql += ' AND b.course_id = ?';
    params.push(courseId);
  } else if (courseSlug) {
    sql += ' AND (c.slug = ? OR c.code = ?)';
    params.push(courseSlug, courseSlug);
  }
  sql += ' ORDER BY b.id DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

/**
 * Get students enrolled in a specific batch via StudentBatchMap and Users
 */
async function getStudentsByBatch(batchId) {
  const [rows] = await db.query(`
    SELECT 
      u.id as student_id,
      u.name,
      u.email,
      u.mobile,
      u.is_active,
      sbm.assigned_at,
      b.id as batch_id,
      b.name as batch_name
    FROM StudentBatchMap sbm
    JOIN Users u ON sbm.student_id = u.id
    JOIN Batches b ON sbm.batch_id = b.id
    WHERE sbm.batch_id = ?
      AND u.role = 'student'
      AND u.is_active = 1
    ORDER BY u.name ASC
  `, [batchId]);
  return rows;
}

/**
 * Get all courses from Stage DB
 */
async function getCourses() {
  const [rows] = await db.query(`
    SELECT id, name, code, slug, duration, status
    FROM Courses
    ORDER BY id ASC
  `);
  return rows;
}

/**
 * Create immutable candidate snapshots for an exam assignment.
 * Generates unique OTP for each candidate atomically.
 */
async function createCandidateSnapshots(assignmentId, batchId, selectedStudentIds = null) {
  // 1. Fetch batch details
  const [batches] = await db.query(`SELECT id, name FROM Batches WHERE id = ?`, [batchId]);
  if (batches.length === 0) {
    throw new Error(`Batch with ID ${batchId} not found in Stage DB.`);
  }
  const batchName = batches[0].name;

  // 2. Fetch eligible students from Stage DB
  let studentQuery = `
    SELECT u.id as student_id, u.name, u.email
    FROM StudentBatchMap sbm
    JOIN Users u ON sbm.student_id = u.id
    WHERE sbm.batch_id = ?
      AND u.role = 'student'
      AND u.is_active = 1
  `;
  const params = [batchId];

  if (selectedStudentIds && Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
    studentQuery += ` AND u.id IN (?)`;
    params.push(selectedStudentIds);
  }

  const [students] = await db.query(studentQuery, params);
  if (students.length === 0) {
    throw new Error('No eligible active students found in this batch.');
  }

  const createdCandidates = [];

  // 3. Insert snapshots into exam_assignment_candidates
  for (const s of students) {
    // Upsert or insert candidate snapshot
    const [existing] = await db.query(
      `SELECT id FROM exam_assignment_candidates WHERE assignment_id = ? AND student_id = ?`,
      [assignmentId, s.student_id]
    );

    let candidateId;
    if (existing.length > 0) {
      candidateId = existing[0].id;
    } else {
      const [insertResult] = await db.query(`
        INSERT INTO exam_assignment_candidates 
          (assignment_id, student_id, snapshot_student_name, snapshot_student_email, snapshot_batch_name, status)
        VALUES (?, ?, ?, ?, ?, 'ELIGIBLE')
      `, [assignmentId, s.student_id, s.name, s.email, batchName]);
      candidateId = insertResult.insertId;
    }

    // 4. Generate unique OTP for this candidate + assignment
    const rawOtp = generateSecureOTP();
    const salt = generateSalt();
    const otpHash = hashOTP(rawOtp, salt);
    const { encrypted: encOtp, iv: otpIv, authTag: otpTag } = encrypt(rawOtp);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration default

    // Insert or update OTP
    await db.query(`DELETE FROM exam_otps WHERE candidate_id = ?`, [candidateId]);
    await db.query(`
      INSERT INTO exam_otps 
        (candidate_id, otp_hash, otp_salt, encrypted_otp, otp_iv, otp_tag, expires_at, attempt_count, max_attempts, is_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 5, 0)
    `, [candidateId, otpHash, salt, encOtp, otpIv, otpTag, expiresAt]);

    createdCandidates.push({
      candidateId,
      studentId: s.student_id,
      name: s.name,
      email: s.email,
      batchName,
      otp: rawOtp // Returned only during initial generation/email dispatch, not exposed in general candidate listings
    });
  }

  return createdCandidates;
}

module.exports = {
  getBatches,
  getStudentsByBatch,
  getCourses,
  createCandidateSnapshots
};
