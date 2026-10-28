const pool = require('../config/db');
const crypto = require('crypto');

class Feedback {
  /**
   * Create a new feedback campaign with selected batches and questions
   */
  static async create({
    title,
    description = null,
    courseId,
    feedbackDate,
    batchIds = [],
    questions = [],
    createdBy = null
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert feedback campaign
      const [campaignResult] = await connection.execute(
        `INSERT INTO feedback_campaigns 
          (title, description, course_id, feedback_date, status, created_by)
         VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
        [
          title.trim(),
          description ? description.trim() : null,
          courseId,
          feedbackDate,
          createdBy || null
        ]
      );
      const feedbackId = campaignResult.insertId;

      // 2. Insert batch associations
      const validBatchIds = (batchIds || [])
        .map(b => parseInt(b, 10))
        .filter(b => !isNaN(b) && b > 0);

      if (validBatchIds.length > 0) {
        const batchValues = validBatchIds.map(() => '(?, ?)').join(', ');
        const batchParams = validBatchIds.flatMap(bId => [feedbackId, bId]);
        await connection.execute(
          `INSERT INTO feedback_batches (feedback_id, batch_id) VALUES ${batchValues}`,
          batchParams
        );
      }

      // 3. Insert questions (preserve order and stable ids)
      if (Array.isArray(questions) && questions.length > 0) {
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qText = (q.question_text || q.questionText || '').trim();
          if (!qText) continue;

          const qType = (q.question_type || q.questionType || 'TEXT').toUpperCase();
          const validTypes = ['TEXT', 'LONG_TEXT', 'RATING', 'SINGLE_CHOICE'];
          const finalType = validTypes.includes(qType) ? qType : 'TEXT';
          
          let optionsJson = null;
          if (finalType === 'SINGLE_CHOICE') {
            const rawOpts = q.options || [];
            const optsArray = Array.isArray(rawOpts) 
              ? rawOpts.map(o => String(o).trim()).filter(Boolean)
              : String(rawOpts).split(',').map(o => o.trim()).filter(Boolean);
            optionsJson = JSON.stringify(optsArray);
          }

          const isRequired = q.is_required !== undefined ? Boolean(q.is_required) : (q.isRequired !== undefined ? Boolean(q.isRequired) : true);
          const orderNum = q.order || q.question_order || (i + 1);

          await connection.execute(
            `INSERT INTO feedback_questions 
              (feedback_id, question_text, question_type, options, question_order, is_required)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [feedbackId, qText, finalType, optionsJson, orderNum, isRequired ? 1 : 0]
          );
        }
      }

      await connection.commit();
      return feedbackId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all feedback campaigns with aggregated student and response metrics
   */
  static async getAll({ courseId = null, search = '', status = '' } = {}) {
    let whereClauses = [];
    const params = [];

    if (courseId) {
      whereClauses.push('fc.course_id = ?');
      params.push(courseId);
    }

    if (status && status !== 'ALL') {
      whereClauses.push('fc.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(fc.title) LIKE ? OR LOWER(c.name) LIKE ?)');
      params.push(q, q);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        fc.id,
        fc.title,
        fc.description,
        fc.course_id,
        DATE_FORMAT(fc.feedback_date, '%Y-%m-%d') as feedback_date,
        fc.status,
        fc.created_by,
        fc.created_at,
        fc.updated_at,
        c.name as course_name,
        c.code as course_code,
        c.slug as course_slug,
        u.name as creator_name,
        (
          SELECT COUNT(DISTINCT q.id)
          FROM feedback_questions q
          WHERE q.feedback_id = fc.id
        ) as total_questions,
        (
          SELECT COUNT(DISTINCT r.id)
          FROM feedback_responses r
          WHERE r.feedback_id = fc.id AND r.status = 'COMPLETED'
        ) as responses_count
      FROM feedback_campaigns fc
      JOIN Courses c ON fc.course_id = c.id
      LEFT JOIN Users u ON fc.created_by = u.id
      ${whereSQL}
      ORDER BY fc.feedback_date DESC, fc.id DESC
    `;

    const [rows] = await pool.execute(query, params);

    if (rows.length === 0) return [];

    const feedbackIds = rows.map(r => r.id);
    const placeholders = feedbackIds.map(() => '?').join(',');

    // Fetch associated batches for each campaign
    const [batchRows] = await pool.execute(
      `SELECT fb.feedback_id, b.id as batch_id, b.name as batch_name
       FROM feedback_batches fb
       JOIN Batches b ON fb.batch_id = b.id
       WHERE fb.feedback_id IN (${placeholders})
       ORDER BY b.name ASC`,
      feedbackIds
    );

    const batchesByFeedback = {};
    batchRows.forEach(b => {
      if (!batchesByFeedback[b.feedback_id]) batchesByFeedback[b.feedback_id] = [];
      batchesByFeedback[b.feedback_id].push({
        id: b.batch_id,
        name: b.batch_name
      });
    });

    // Compute total eligible students for each feedback campaign based on assigned batches
    // (or course students if no batches)
    const result = await Promise.all(
      rows.map(async r => {
        const assignedBatches = batchesByFeedback[r.id] || [];
        const batchIds = assignedBatches.map(b => b.id);

        let totalStudents = 0;
        if (batchIds.length > 0) {
          const bPlaceholders = batchIds.map(() => '?').join(',');
          const [studCountRows] = await pool.execute(
            `SELECT COUNT(DISTINCT u.id) as count
             FROM Users u
             JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.role = 'student' AND cm.status = 'active'
             JOIN StudentBatchMap sbm ON u.id = sbm.student_id
             WHERE sbm.batch_id IN (${bPlaceholders}) AND u.role = 'student'`,
            [r.course_id, ...batchIds]
          );
          totalStudents = studCountRows[0]?.count || 0;
        } else {
          // If no batches, include unassigned students belonging to course
          const [studCountRows] = await pool.execute(
            `SELECT COUNT(DISTINCT u.id) as count
             FROM Users u
             JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.role = 'student' AND cm.status = 'active'
             LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
             WHERE (sbm.batch_id IS NULL OR sbm.batch_id = 0) AND u.role = 'student'`,
            [r.course_id]
          );
          totalStudents = studCountRows[0]?.count || 0;
        }

        const completedResponses = Number(r.responses_count || 0);
        const pendingResponses = Math.max(0, totalStudents - completedResponses);

        return {
          ...r,
          batches: assignedBatches,
          total_students: totalStudents,
          responses_count: completedResponses,
          pending_count: pendingResponses
        };
      })
    );

    return result;
  }

  /**
   * Get single feedback campaign details with questions and batches
   */
  static async getById(id) {
    const [rows] = await pool.execute(
      `SELECT 
        fc.id,
        fc.title,
        fc.description,
        fc.course_id,
        DATE_FORMAT(fc.feedback_date, '%Y-%m-%d') as feedback_date,
        fc.status,
        fc.share_token,
        fc.created_by,
        fc.created_at,
        fc.updated_at,
        c.name as course_name,
        c.code as course_code,
        c.slug as course_slug,
        u.name as creator_name
      FROM feedback_campaigns fc
      JOIN Courses c ON fc.course_id = c.id
      LEFT JOIN Users u ON fc.created_by = u.id
      WHERE fc.id = ?
      LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return null;
    const campaign = rows[0];

    // Fetch batches
    const [batches] = await pool.execute(
      `SELECT b.id, b.name
       FROM feedback_batches fb
       JOIN Batches b ON fb.batch_id = b.id
       WHERE fb.feedback_id = ?
       ORDER BY b.name ASC`,
      [id]
    );
    campaign.batches = batches;

    // Fetch questions ordered
    const [questions] = await pool.execute(
      `SELECT 
        id,
        feedback_id,
        question_text,
        question_type,
        options,
        question_order,
        is_required,
        created_at,
        updated_at
       FROM feedback_questions
       WHERE feedback_id = ?
       ORDER BY question_order ASC, id ASC`,
      [id]
    );

    campaign.questions = questions.map(q => {
      let parsedOptions = [];
      if (q.options) {
        try {
          parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch {
          parsedOptions = [];
        }
      }
      return {
        ...q,
        options: parsedOptions,
        is_required: Boolean(q.is_required)
      };
    });

    // Fetch batch-wise and overall statistics
    const batchIds = batches.map(b => b.id);
    let batchStats = [];
    let totalStudents = 0;

    if (batchIds.length > 0) {
      for (const b of batches) {
        const [studRows] = await pool.execute(
          `SELECT COUNT(DISTINCT u.id) as total
           FROM Users u
           JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.role = 'student' AND cm.status = 'active'
           JOIN StudentBatchMap sbm ON u.id = sbm.student_id
           WHERE sbm.batch_id = ? AND u.role = 'student'`,
          [campaign.course_id, b.id]
        );
        const bTotal = studRows[0]?.total || 0;

        const [respRows] = await pool.execute(
          `SELECT COUNT(DISTINCT r.id) as completed
           FROM feedback_responses r
           WHERE r.feedback_id = ? AND r.batch_id = ? AND r.status = 'COMPLETED'`,
          [id, b.id]
        );
        const bCompleted = respRows[0]?.completed || 0;

        batchStats.push({
          batch_id: b.id,
          batch_name: b.name,
          total: bTotal,
          completed: bCompleted,
          pending: Math.max(0, bTotal - bCompleted)
        });

        totalStudents += bTotal;
      }
    }

    const [compRows] = await pool.execute(
      `SELECT COUNT(DISTINCT r.id) as completed_count
       FROM feedback_responses r
       WHERE r.feedback_id = ? AND r.status = 'COMPLETED'`,
      [id]
    );
    const completedCount = compRows[0]?.completed_count || 0;

    campaign.total_students = totalStudents;
    campaign.completed_count = completedCount;
    campaign.pending_count = Math.max(0, totalStudents - completedCount);
    campaign.completion_rate = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;
    campaign.batch_stats = batchStats;

    return campaign;
  }

  /**
   * Update feedback campaign details, batches, and questions
   */
  static async update(id, {
    title,
    description,
    feedbackDate,
    status,
    batchIds = null,
    questions = null
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.execute(
        'SELECT id, course_id FROM feedback_campaigns WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        await connection.rollback();
        return false;
      }

      // 1. Update campaign fields
      const updates = [];
      const params = [];

      if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description ? description.trim() : null); }
      if (feedbackDate !== undefined) { updates.push('feedback_date = ?'); params.push(feedbackDate); }
      if (status !== undefined) { updates.push('status = ?'); params.push(status); }

      if (updates.length > 0) {
        params.push(id);
        await connection.execute(
          `UPDATE feedback_campaigns SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      // 2. Update Batches if provided
      if (Array.isArray(batchIds)) {
        const validBatchIds = batchIds
          .map(b => parseInt(b, 10))
          .filter(b => !isNaN(b) && b > 0);

        await connection.execute('DELETE FROM feedback_batches WHERE feedback_id = ?', [id]);

        if (validBatchIds.length > 0) {
          const batchValues = validBatchIds.map(() => '(?, ?)').join(', ');
          const batchParams = validBatchIds.flatMap(bId => [id, bId]);
          await connection.execute(
            `INSERT INTO feedback_batches (feedback_id, batch_id) VALUES ${batchValues}`,
            batchParams
          );
        }
      }

      // 3. Update Questions if provided
      if (Array.isArray(questions)) {
        // If there are existing responses, we preserve existing questions with answers
        // or update them, while adding new questions
        const [existingQRows] = await connection.execute(
          'SELECT id FROM feedback_questions WHERE feedback_id = ?',
          [id]
        );
        const existingQIds = new Set(existingQRows.map(q => q.id));
        const incomingQIds = new Set();

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qText = (q.question_text || q.questionText || '').trim();
          if (!qText) continue;

          const qType = (q.question_type || q.questionType || 'TEXT').toUpperCase();
          const validTypes = ['TEXT', 'LONG_TEXT', 'RATING', 'SINGLE_CHOICE'];
          const finalType = validTypes.includes(qType) ? qType : 'TEXT';

          let optionsJson = null;
          if (finalType === 'SINGLE_CHOICE') {
            const rawOpts = q.options || [];
            const optsArray = Array.isArray(rawOpts) 
              ? rawOpts.map(o => String(o).trim()).filter(Boolean)
              : String(rawOpts).split(',').map(o => o.trim()).filter(Boolean);
            optionsJson = JSON.stringify(optsArray);
          }

          const isRequired = q.is_required !== undefined ? Boolean(q.is_required) : (q.isRequired !== undefined ? Boolean(q.isRequired) : true);
          const orderNum = q.order || q.question_order || (i + 1);

          if (q.id && existingQIds.has(q.id)) {
            incomingQIds.add(q.id);
            await connection.execute(
              `UPDATE feedback_questions 
               SET question_text = ?, question_type = ?, options = ?, question_order = ?, is_required = ?
               WHERE id = ? AND feedback_id = ?`,
              [qText, finalType, optionsJson, orderNum, isRequired ? 1 : 0, q.id, id]
            );
          } else {
            const [insertRes] = await connection.execute(
              `INSERT INTO feedback_questions 
                (feedback_id, question_text, question_type, options, question_order, is_required)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [id, qText, finalType, optionsJson, orderNum, isRequired ? 1 : 0]
            );
            incomingQIds.add(insertRes.insertId);
          }
        }

        // Delete questions removed from builder only if they do not have answers
        for (const oldQId of existingQIds) {
          if (!incomingQIds.has(oldQId)) {
            // Check if any answers exist for this question
            const [ansRows] = await connection.execute(
              'SELECT id FROM feedback_answers WHERE question_id = ? LIMIT 1',
              [oldQId]
            );
            if (ansRows.length === 0) {
              await connection.execute('DELETE FROM feedback_questions WHERE id = ?', [oldQId]);
            }
          }
        }
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete feedback campaign
   */
  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM feedback_campaigns WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get eligible students organized batch-wise for a feedback campaign
   */
  static async getStudents(feedbackId, { search = '', batchFilter = '', statusFilter = '' } = {}) {
    // 1. Get campaign metadata & selected batches
    const [campaignRows] = await pool.execute(
      'SELECT id, course_id FROM feedback_campaigns WHERE id = ?',
      [feedbackId]
    );
    if (campaignRows.length === 0) return [];
    const courseId = campaignRows[0].course_id;

    const [batchRows] = await pool.execute(
      'SELECT batch_id FROM feedback_batches WHERE feedback_id = ?',
      [feedbackId]
    );
    const selectedBatchIds = batchRows.map(b => b.batch_id);

    // 2. Build student selection query
    let whereClauses = [
      'u.role = "student"',
      'cm.course_id = ?',
      'cm.role = "student"',
      'cm.status = "active"'
    ];
    const params = [courseId];

    if (selectedBatchIds.length > 0) {
      if (batchFilter && batchFilter !== 'ALL') {
        const bId = parseInt(batchFilter, 10);
        whereClauses.push('sbm.batch_id = ?');
        params.push(bId);
      } else {
        const placeholders = selectedBatchIds.map(() => '?').join(',');
        whereClauses.push(`sbm.batch_id IN (${placeholders})`);
        params.push(...selectedBatchIds);
      }
    } else {
      // If no batches configured, target unassigned students of this course
      whereClauses.push('(sbm.batch_id IS NULL OR sbm.batch_id = 0)');
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR u.mobile LIKE ?)');
      params.push(q, q, q);
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

    // Query students joined with their feedback response status
    const query = `
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        u.mobile as student_mobile,
        u.domain,
        u.college,
        u.passout_year,
        b.id as batch_id,
        COALESCE(b.name, 'Unassigned') as batch_name,
        CASE WHEN b.id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned,
        r.id as response_id,
        COALESCE(r.status, 'PENDING') as feedback_status,
        r.overall_feedback,
        r.submitted_at,
        u_sub.name as submitted_by_name,
        fsl.token as share_token,
        COALESCE(fsl.status, 'PENDING') as share_status,
        fsl.edit_requested_at,
        fsl.edit_request_reason,
        fsl.edit_granted_at
      FROM Users u
      JOIN CourseMemberships cm ON u.id = cm.user_id
      LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
      LEFT JOIN Batches b ON sbm.batch_id = b.id
      LEFT JOIN feedback_responses r ON r.feedback_id = ${parseInt(feedbackId, 10)} AND r.student_id = u.id
      LEFT JOIN Users u_sub ON r.submitted_by = u_sub.id
      LEFT JOIN feedback_student_links fsl ON fsl.feedback_id = ${parseInt(feedbackId, 10)} AND fsl.student_id = u.id
      ${whereSQL}
      ORDER BY 
        CASE WHEN b.name IS NOT NULL THEN 0 ELSE 1 END,
        b.name ASC,
        u.name ASC
    `;

    const [rows] = await pool.execute(query, params);

    // Auto-generate missing links for eligible students so unique links are immediately usable
    await Feedback.ensureStudentLinks(feedbackId, rows);

    // Apply status filter if provided
    if (statusFilter && statusFilter !== 'ALL') {
      return rows.filter(r => r.feedback_status === statusFilter);
    }

    return rows;
  }

  /**
   * Get student's submitted feedback response and answers
   */
  static async getStudentResponse(feedbackId, studentId) {
    const [respRows] = await pool.execute(
      `SELECT 
        r.id as response_id,
        r.feedback_id,
        r.student_id,
        r.batch_id,
        r.status,
        r.overall_feedback,
        r.submitted_at,
        r.submitted_by,
        u_sub.name as submitted_by_name,
        u.name as student_name,
        u.email as student_email,
        u.mobile as student_mobile,
        b.name as batch_name
       FROM feedback_responses r
       JOIN Users u ON r.student_id = u.id
       LEFT JOIN Batches b ON r.batch_id = b.id
       LEFT JOIN Users u_sub ON r.submitted_by = u_sub.id
       WHERE r.feedback_id = ? AND r.student_id = ?
       LIMIT 1`,
      [feedbackId, studentId]
    );

    if (respRows.length === 0) return null;
    const response = respRows[0];

    // Fetch answers joined with questions
    const [answers] = await pool.execute(
      `SELECT 
        a.id as answer_id,
        a.question_id,
        a.answer_text,
        a.rating_value,
        q.question_text,
        q.question_type,
        q.options,
        q.question_order,
        q.is_required
       FROM feedback_answers a
       JOIN feedback_questions q ON a.question_id = q.id
       WHERE a.response_id = ?
       ORDER BY q.question_order ASC, q.id ASC`,
      [response.response_id]
    );

    response.answers = answers.map(a => {
      let parsedOptions = [];
      if (a.options) {
        try {
          parsedOptions = typeof a.options === 'string' ? JSON.parse(a.options) : a.options;
        } catch {
          parsedOptions = [];
        }
      }
      return {
        ...a,
        options: parsedOptions,
        is_required: Boolean(a.is_required)
      };
    });

    return response;
  }

  /**
   * Submit or update a student feedback response with answers (with duplicate guard)
   */
  static async submitResponse({
    feedbackId,
    studentId,
    batchId = null,
    overallFeedback = null,
    answers = [], // [{ questionId, answerText, ratingValue }]
    submittedBy = null
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Resolve student's current batch if not explicitly passed
      let effectiveBatchId = batchId ? parseInt(batchId, 10) : null;
      if (!effectiveBatchId) {
        const [bRows] = await connection.execute(
          'SELECT batch_id FROM StudentBatchMap WHERE student_id = ? LIMIT 1',
          [studentId]
        );
        if (bRows.length > 0 && bRows[0].batch_id) {
          effectiveBatchId = bRows[0].batch_id;
        }
      }

      // Check if response already exists
      const [existing] = await connection.execute(
        'SELECT id FROM feedback_responses WHERE feedback_id = ? AND student_id = ? LIMIT 1',
        [feedbackId, studentId]
      );

      let responseId;
      if (existing.length > 0) {
        // Update existing response
        responseId = existing[0].id;
        await connection.execute(
          `UPDATE feedback_responses 
           SET batch_id = ?, overall_feedback = ?, status = 'COMPLETED', submitted_by = ?, submitted_at = NOW()
           WHERE id = ?`,
          [effectiveBatchId, overallFeedback || null, submittedBy || null, responseId]
        );
      } else {
        // Insert new response (UNIQUE KEY uk_feedback_student provides database-level lock)
        const [insertRes] = await connection.execute(
          `INSERT INTO feedback_responses 
            (feedback_id, student_id, batch_id, status, overall_feedback, submitted_by, submitted_at)
           VALUES (?, ?, ?, 'COMPLETED', ?, ?, NOW())`,
          [feedbackId, studentId, effectiveBatchId, overallFeedback || null, submittedBy || null]
        );
        responseId = insertRes.insertId;
      }

      // Upsert answers
      if (Array.isArray(answers) && answers.length > 0) {
        for (const item of answers) {
          const qId = parseInt(item.questionId || item.question_id, 10);
          if (isNaN(qId) || qId <= 0) continue;

          const ansText = item.answerText !== undefined ? item.answerText : (item.answer_text !== undefined ? item.answer_text : null);
          const ratingVal = item.ratingValue !== undefined ? item.ratingValue : (item.rating_value !== undefined ? item.rating_value : null);

          await connection.execute(
            `INSERT INTO feedback_answers 
              (response_id, question_id, answer_text, rating_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
              answer_text = VALUES(answer_text),
              rating_value = VALUES(rating_value),
              updated_at = NOW()`,
            [responseId, qId, ansText ? String(ansText).trim() : null, ratingVal !== null && !isNaN(ratingVal) ? parseInt(ratingVal, 10) : null]
          );
        }
      }

      await connection.commit();
      return responseId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Helper to ensure every eligible student has a unique share link
   */
  static async ensureStudentLinks(feedbackId, students) {
    if (!students || students.length === 0) return students;
    const missing = students.filter(s => !s.share_token);
    if (missing.length === 0) return students;

    const connection = await pool.getConnection();
    try {
      for (const s of missing) {
        const token = `sft_${crypto.randomBytes(16).toString('hex')}`;
        await connection.execute(
          `INSERT INTO feedback_student_links (feedback_id, student_id, token, status)
           VALUES (?, ?, ?, 'PENDING')
           ON DUPLICATE KEY UPDATE token = VALUES(token)`,
          [feedbackId, s.student_id, token]
        );
        s.share_token = token;
        s.share_status = 'PENDING';
      }
    } catch (err) {
      console.warn('Could not auto-generate missing student link tokens:', err.message);
    } finally {
      connection.release();
    }
    return students;
  }

  /**
   * Get feedback campaign & student questionnaire by public unique token
   */
  static async getByToken(token) {
    const [linkRows] = await pool.execute(
      `SELECT 
        fsl.id as link_id,
        fsl.feedback_id,
        fsl.student_id,
        fsl.token,
        fsl.status as link_status,
        fsl.edit_requested_at,
        fsl.edit_request_reason,
        fsl.edit_granted_at,
        fsl.submitted_at,
        u.name as student_name,
        u.email as student_email,
        u.mobile as student_mobile,
        fc.title as campaign_title,
        fc.description as campaign_description,
        DATE_FORMAT(fc.feedback_date, '%Y-%m-%d') as feedback_date,
        c.name as course_name,
        b.name as batch_name,
        b.id as batch_id
       FROM feedback_student_links fsl
       JOIN feedback_campaigns fc ON fsl.feedback_id = fc.id
       JOIN Courses c ON fc.course_id = c.id
       JOIN Users u ON fsl.student_id = u.id
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       WHERE fsl.token = ?
       LIMIT 1`,
      [token]
    );

    if (linkRows.length === 0) return null;
    const data = linkRows[0];

    // Fetch questions
    const [questions] = await pool.execute(
      `SELECT 
        id,
        feedback_id,
        question_text,
        question_type,
        options,
        question_order,
        is_required
       FROM feedback_questions
       WHERE feedback_id = ?
       ORDER BY question_order ASC, id ASC`,
      [data.feedback_id]
    );

    data.questions = questions.map(q => {
      let parsedOptions = [];
      if (q.options) {
        try {
          parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch {
          parsedOptions = [];
        }
      }
      return {
        ...q,
        options: parsedOptions,
        is_required: Boolean(q.is_required)
      };
    });

    // Check if response exists (for pre-filling when editing or viewing summary)
    const [respRows] = await pool.execute(
      `SELECT id, status, overall_feedback, submitted_at
       FROM feedback_responses
       WHERE feedback_id = ? AND student_id = ?
       LIMIT 1`,
      [data.feedback_id, data.student_id]
    );

    if (respRows.length > 0) {
      data.response = respRows[0];
      const [answers] = await pool.execute(
        `SELECT question_id, answer_text, rating_value
         FROM feedback_answers
         WHERE response_id = ?`,
        [respRows[0].id]
      );
      data.answers = answers;
    } else {
      data.response = null;
      data.answers = [];
    }

    return data;
  }

  /**
   * Request edit access from coordinator (called by student)
   */
  static async requestEditAccess(token, reason = null) {
    const [result] = await pool.execute(
      `UPDATE feedback_student_links 
       SET status = 'EDIT_REQUESTED', edit_requested_at = NOW(), edit_request_reason = ?
       WHERE token = ?`,
      [reason ? String(reason).trim() : null, token]
    );
    return result.affectedRows > 0;
  }

  /**
   * Allow edit access (coordinator approves)
   */
  static async allowEditAccess(feedbackId, studentId, coordinatorId = null) {
    const [result] = await pool.execute(
      `UPDATE feedback_student_links 
       SET status = 'EDIT_ALLOWED', edit_granted_at = NOW(), edit_granted_by = ?
       WHERE feedback_id = ? AND student_id = ?`,
      [coordinatorId, feedbackId, studentId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Reject / revoke edit request
   */
  static async rejectEditAccess(feedbackId, studentId) {
    const [result] = await pool.execute(
      `UPDATE feedback_student_links 
       SET status = 'SUBMITTED', edit_request_reason = NULL
       WHERE feedback_id = ? AND student_id = ?`,
      [feedbackId, studentId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get all edit requests for a campaign
   */
  static async getEditRequests(feedbackId) {
    const [rows] = await pool.execute(
      `SELECT 
        fsl.id as link_id,
        fsl.feedback_id,
        fsl.student_id,
        fsl.token,
        fsl.status as link_status,
        fsl.edit_requested_at,
        fsl.edit_request_reason,
        u.name as student_name,
        u.email as student_email,
        u.mobile as student_mobile,
        b.name as batch_name
       FROM feedback_student_links fsl
       JOIN Users u ON fsl.student_id = u.id
       LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
       LEFT JOIN Batches b ON sbm.batch_id = b.id
       WHERE fsl.feedback_id = ? AND fsl.status = 'EDIT_REQUESTED'
       ORDER BY fsl.edit_requested_at DESC`,
      [feedbackId]
    );
    return rows;
  }

  /**
   * Common Report Data Service
   * Retrieves complete feedback campaign report with all submitted responses & answers
   */
  static async getReportData(id) {
    const campaign = await Feedback.getById(id);
    if (!campaign) return null;

    // Fetch all submitted responses
    const [responseRows] = await pool.execute(
      `SELECT 
        r.id as response_id,
        r.feedback_id,
        r.student_id,
        r.batch_id,
        r.status,
        r.overall_feedback,
        r.submitted_at,
        u.name as student_name,
        u.email as student_email,
        u.mobile as student_mobile,
        COALESCE(b.name, 'Unassigned') as batch_name
       FROM feedback_responses r
       JOIN Users u ON r.student_id = u.id
       LEFT JOIN Batches b ON r.batch_id = b.id
       WHERE r.feedback_id = ? AND r.status = 'COMPLETED'
       ORDER BY 
         CASE WHEN b.name IS NOT NULL THEN 0 ELSE 1 END,
         b.name ASC,
         u.name ASC`,
      [id]
    );

    // If there are responses, fetch all answers for these responses
    let answersByResponse = {};
    if (responseRows.length > 0) {
      const respIds = responseRows.map(r => r.response_id);
      const placeholders = respIds.map(() => '?').join(',');
      const [answerRows] = await pool.execute(
        `SELECT 
          a.id as answer_id,
          a.response_id,
          a.question_id,
          a.answer_text,
          a.rating_value,
          q.question_text,
          q.question_type,
          q.options,
          q.question_order,
          q.is_required
         FROM feedback_answers a
         JOIN feedback_questions q ON a.question_id = q.id
         WHERE a.response_id IN (${placeholders})
         ORDER BY q.question_order ASC, q.id ASC`,
        respIds
      );

      answerRows.forEach(a => {
        if (!answersByResponse[a.response_id]) answersByResponse[a.response_id] = [];
        answersByResponse[a.response_id].push(a);
      });
    }

    const responsesWithAnswers = responseRows.map(r => ({
      ...r,
      answers: answersByResponse[r.response_id] || []
    }));

    return {
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        course_id: campaign.course_id,
        course_name: campaign.course_name,
        course_code: campaign.course_code,
        course_slug: campaign.course_slug,
        feedback_date: campaign.feedback_date,
        status: campaign.status,
        share_token: campaign.share_token,
        creator_name: campaign.creator_name,
        created_at: campaign.created_at
      },
      batches: campaign.batches || [],
      questions: campaign.questions || [],
      stats: {
        total_students: campaign.total_students || 0,
        completed_count: responseRows.length,
        completed_responses: responseRows.length,
        pending_count: Math.max(0, (campaign.total_students || 0) - responseRows.length),
        pending_responses: Math.max(0, (campaign.total_students || 0) - responseRows.length),
        completion_rate: (campaign.total_students > 0) 
          ? Math.round((responseRows.length / campaign.total_students) * 100) 
          : 0,
        batch_stats: campaign.batch_stats || []
      },
      responses: responsesWithAnswers
    };
  }

  /**
   * Retrieve catalog report data by public campaign share token
   */
  static async getReportByShareToken(token) {
    if (!token) return null;
    const [rows] = await pool.execute(
      'SELECT id FROM feedback_campaigns WHERE share_token = ? LIMIT 1',
      [token]
    );
    if (rows.length === 0) return null;
    return await Feedback.getReportData(rows[0].id);
  }

  /**
   * Generate or renew public share token for feedback campaign
   */
  static async generateCampaignShareToken(feedbackId) {
    const token = `fbc_${crypto.randomBytes(16).toString('hex')}`;
    await pool.execute(
      'UPDATE feedback_campaigns SET share_token = ? WHERE id = ?',
      [token, feedbackId]
    );
    return token;
  }

  /**
   * Revoke campaign public share token
   */
  static async revokeCampaignShareToken(feedbackId) {
    await pool.execute(
      'UPDATE feedback_campaigns SET share_token = NULL WHERE id = ?',
      [feedbackId]
    );
    return true;
  }
}

module.exports = Feedback;
