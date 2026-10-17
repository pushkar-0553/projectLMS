const pool = require('../config/db');

class MockInterview {
  /**
   * Helper to format minutes from midnight to HH:mm:ss
   */
  static minutesToTimeString(minutes) {
    const hrs = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  }

  /**
   * Helper to parse HH:mm or HH:mm:ss into minutes from midnight
   */
  static timeStringToMinutes(timeStr) {
    if (!timeStr) return 600; // default 10:00 AM (600 mins)
    const parts = String(timeStr).split(':');
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hrs * 60 + mins;
  }

  /**
   * Create a new mock interview drive and enroll all eligible students
   */
  static async create({
    title,
    description,
    courseId,
    interviewDate,
    startTime = '10:00:00',
    defaultDurationMins = 20,
    meetLink = null,
    batchIds = [],
    createdBy = null
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert mock interview event
      const [eventResult] = await connection.execute(
        `INSERT INTO mock_interview_events 
          (title, description, course_id, interview_date, start_time, default_duration_mins, meet_link, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'UPCOMING', ?)`,
        [
          title,
          description || null,
          courseId,
          interviewDate,
          startTime || '10:00:00',
          defaultDurationMins || 20,
          meetLink || null,
          createdBy || null
        ]
      );
      const mockInterviewId = eventResult.insertId;

      // 2. Insert batch associations
      const validBatchIds = (batchIds || [])
        .map(b => parseInt(b, 10))
        .filter(b => !isNaN(b) && b > 0);

      if (validBatchIds.length > 0) {
        const batchValues = validBatchIds.map(() => '(?, ?)').join(', ');
        const batchParams = validBatchIds.flatMap(bId => [mockInterviewId, bId]);
        await connection.execute(
          `INSERT INTO mock_interview_batches (mock_interview_id, batch_id) VALUES ${batchValues}`,
          batchParams
        );
      }

      // 3. Identify and enroll eligible students:
      // (Students from selected batches + unassigned students belonging to course)
      let eligibleQuery = `
        SELECT DISTINCT u.id as student_id
        FROM Users u
        JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.role = 'student' AND cm.status = 'active'
        LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
        WHERE u.role = 'student'
      `;
      const eligibleParams = [courseId];

      if (validBatchIds.length > 0) {
        const placeholders = validBatchIds.map(() => '?').join(', ');
        eligibleQuery += ` AND (sbm.batch_id IN (${placeholders}) OR sbm.batch_id IS NULL OR sbm.batch_id = 0)`;
        eligibleParams.push(...validBatchIds);
      } else {
        // If no batches explicitly selected, include all unassigned students in course
        eligibleQuery += ` AND (sbm.batch_id IS NULL OR sbm.batch_id = 0)`;
      }

      const [eligibleStudents] = await connection.execute(eligibleQuery, eligibleParams);

      if (eligibleStudents.length > 0) {
        const studentPlaceholders = eligibleStudents.map(() => '(?, ?, "ELIGIBLE")').join(', ');
        const studentParams = eligibleStudents.flatMap(s => [mockInterviewId, s.student_id]);
        await connection.execute(
          `INSERT INTO mock_interview_participants (mock_interview_id, student_id, status)
           VALUES ${studentPlaceholders}
           ON DUPLICATE KEY UPDATE status = status`,
          studentParams
        );
      }

      await connection.commit();
      return mockInterviewId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all mock interviews (scoped by courseId if given) with aggregate participant statistics
   */
  static async getAll({ courseId = null, search = '', status = '' } = {}) {
    let whereClauses = [];
    const params = [];

    if (courseId) {
      whereClauses.push('m.course_id = ?');
      params.push(courseId);
    }

    if (status) {
      whereClauses.push('m.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push('(m.title LIKE ? OR m.description LIKE ?)');
      const q = `%${search.trim()}%`;
      params.push(q, q);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT 
        m.id,
        m.title,
        m.description,
        m.course_id,
        DATE_FORMAT(m.interview_date, '%Y-%m-%d') as interview_date,
        TIME_FORMAT(m.start_time, '%H:%i') as start_time,
        m.default_duration_mins,
        m.meet_link,
        m.whatsapp_template,
        m.status,
        m.created_by,
        m.created_at,
        m.updated_at,
        c.name as course_name,
        c.code as course_code,
        c.slug as course_slug,
        u_creator.name as creator_name,
        COUNT(DISTINCT p.id) as total_students,
        COUNT(DISTINCT CASE WHEN p.status IN ('INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED') THEN p.id END) as interested_count,
        COUNT(DISTINCT CASE WHEN p.status = 'NOT_INTERESTED' THEN p.id END) as not_interested_count,
        COUNT(DISTINCT CASE WHEN p.status = 'SCHEDULED' THEN p.id END) as scheduled_count,
        COUNT(DISTINCT CASE WHEN p.status = 'IN_PROGRESS' THEN p.id END) as in_progress_count,
        COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.id END) as completed_count
      FROM mock_interview_events m
      JOIN Courses c ON m.course_id = c.id
      LEFT JOIN Users u_creator ON m.created_by = u_creator.id
      LEFT JOIN mock_interview_participants p ON m.id = p.mock_interview_id
      ${whereSQL}
      GROUP BY m.id, c.name, c.code, c.slug, u_creator.name
      ORDER BY m.interview_date DESC, m.created_at DESC`,
      params
    );

    if (rows.length === 0) return [];

    // Attach batch details for each mock interview
    const mockIds = rows.map(r => r.id);
    const placeholders = mockIds.map(() => '?').join(', ');
    const [batchRows] = await pool.execute(
      `SELECT mib.mock_interview_id, b.id as batch_id, b.name as batch_name
       FROM mock_interview_batches mib
       JOIN Batches b ON mib.batch_id = b.id
       WHERE mib.mock_interview_id IN (${placeholders})
       ORDER BY b.name ASC`,
      mockIds
    );

    const batchesByMock = {};
    for (const b of batchRows) {
      if (!batchesByMock[b.mock_interview_id]) {
        batchesByMock[b.mock_interview_id] = [];
      }
      batchesByMock[b.mock_interview_id].push({
        id: b.batch_id,
        name: b.batch_name
      });
    }

    return rows.map(r => ({
      ...r,
      batches: batchesByMock[r.id] || []
    }));
  }

  /**
   * Get single mock interview event details by ID
   */
  static async getById(id) {
    const [rows] = await pool.execute(
      `SELECT 
        m.id,
        m.title,
        m.description,
        m.course_id,
        DATE_FORMAT(m.interview_date, '%Y-%m-%d') as interview_date,
        TIME_FORMAT(m.start_time, '%H:%i') as start_time,
        m.default_duration_mins,
        m.meet_link,
        m.whatsapp_template,
        m.status,
        m.created_by,
        m.created_at,
        m.updated_at,
        c.name as course_name,
        c.code as course_code,
        c.slug as course_slug,
        u_creator.name as creator_name,
        COUNT(DISTINCT p.id) as total_students,
        COUNT(DISTINCT CASE WHEN p.status IN ('INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED') THEN p.id END) as interested_count,
        COUNT(DISTINCT CASE WHEN p.status = 'NOT_INTERESTED' THEN p.id END) as not_interested_count,
        COUNT(DISTINCT CASE WHEN p.status = 'SCHEDULED' THEN p.id END) as scheduled_count,
        COUNT(DISTINCT CASE WHEN p.status = 'IN_PROGRESS' THEN p.id END) as in_progress_count,
        COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.id END) as completed_count
      FROM mock_interview_events m
      JOIN Courses c ON m.course_id = c.id
      LEFT JOIN Users u_creator ON m.created_by = u_creator.id
      LEFT JOIN mock_interview_participants p ON m.id = p.mock_interview_id
      WHERE m.id = ?
      GROUP BY m.id, c.name, c.code, c.slug, u_creator.name
      LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return null;
    const event = rows[0];

    // Fetch batches
    const [batches] = await pool.execute(
      `SELECT b.id, b.name
       FROM mock_interview_batches mib
       JOIN Batches b ON mib.batch_id = b.id
       WHERE mib.mock_interview_id = ?
       ORDER BY b.name ASC`,
      [id]
    );

    event.batches = batches;
    return event;
  }

  /**
   * Update mock interview details (metadata and optionally selected batches)
   */
  static async update(id, {
    title,
    description,
    interviewDate,
    startTime,
    defaultDurationMins,
    meetLink,
    whatsappTemplate,
    batchIds = null,
    status = null
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.execute(
        'SELECT course_id FROM mock_interview_events WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        await connection.rollback();
        return false;
      }
      const courseId = existing[0].course_id;

      // Update event metadata
      const updates = [];
      const params = [];

      if (title !== undefined) { updates.push('title = ?'); params.push(title); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (interviewDate !== undefined) { updates.push('interview_date = ?'); params.push(interviewDate); }
      if (startTime !== undefined) { updates.push('start_time = ?'); params.push(startTime); }
      if (defaultDurationMins !== undefined) { updates.push('default_duration_mins = ?'); params.push(defaultDurationMins); }
      if (meetLink !== undefined) { updates.push('meet_link = ?'); params.push(meetLink); }
      if (whatsappTemplate !== undefined) { updates.push('whatsapp_template = ?'); params.push(whatsappTemplate); }
      if (status !== undefined) { updates.push('status = ?'); params.push(status); }

      if (updates.length > 0) {
        params.push(id);
        await connection.execute(
          `UPDATE mock_interview_events SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      // If batchIds provided, safely update batches without deleting existing participant records
      if (Array.isArray(batchIds)) {
        const validBatchIds = batchIds
          .map(b => parseInt(b, 10))
          .filter(b => !isNaN(b) && b > 0);

        // Delete previous batch links
        await connection.execute(
          'DELETE FROM mock_interview_batches WHERE mock_interview_id = ?',
          [id]
        );

        // Insert new batch links
        if (validBatchIds.length > 0) {
          const batchValues = validBatchIds.map(() => '(?, ?)').join(', ');
          const batchParams = validBatchIds.flatMap(bId => [id, bId]);
          await connection.execute(
            `INSERT INTO mock_interview_batches (mock_interview_id, batch_id) VALUES ${batchValues}`,
            batchParams
          );
        }

        // Add newly eligible students from newly selected batches (preserves existing student states)
        let eligibleQuery = `
          SELECT DISTINCT u.id as student_id
          FROM Users u
          JOIN CourseMemberships cm ON u.id = cm.user_id AND cm.course_id = ? AND cm.role = 'student' AND cm.status = 'active'
          LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
          WHERE u.role = 'student'
        `;
        const eligibleParams = [courseId];

        if (validBatchIds.length > 0) {
          const placeholders = validBatchIds.map(() => '?').join(', ');
          eligibleQuery += ` AND (sbm.batch_id IN (${placeholders}) OR sbm.batch_id IS NULL OR sbm.batch_id = 0)`;
          eligibleParams.push(...validBatchIds);
        } else {
          eligibleQuery += ` AND (sbm.batch_id IS NULL OR sbm.batch_id = 0)`;
        }

        const [eligibleStudents] = await connection.execute(eligibleQuery, eligibleParams);

        if (eligibleStudents.length > 0) {
          const studentPlaceholders = eligibleStudents.map(() => '(?, ?, "ELIGIBLE")').join(', ');
          const studentParams = eligibleStudents.flatMap(s => [id, s.student_id]);
          await connection.execute(
            `INSERT INTO mock_interview_participants (mock_interview_id, student_id, status)
             VALUES ${studentPlaceholders}
             ON DUPLICATE KEY UPDATE status = status`,
            studentParams
          );
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
   * Update Meet Link directly (fast inline update)
   */
  static async updateMeetLink(id, meetLink) {
    const [result] = await pool.execute(
      'UPDATE mock_interview_events SET meet_link = ? WHERE id = ?',
      [meetLink || null, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Update WhatsApp template directly
   */
  static async updateWhatsAppTemplate(id, template) {
    const [result] = await pool.execute(
      'UPDATE mock_interview_events SET whatsapp_template = ? WHERE id = ?',
      [template !== undefined ? template : null, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete mock interview
   */
  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM mock_interview_events WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get eligible & participating students for a mock interview with rich profile details
   */
  static async getStudents(mockInterviewId, {
    search = '',
    batchFilter = '',
    statusFilter = '',
    isInterestedView = false
  } = {}) {
    let whereClauses = ['p.mock_interview_id = ?'];
    const params = [mockInterviewId];

    if (isInterestedView) {
      whereClauses.push("p.status IN ('INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')");
    } else if (statusFilter) {
      whereClauses.push('p.status = ?');
      params.push(statusFilter);
    }

    if (batchFilter) {
      if (batchFilter === 'unassigned') {
        whereClauses.push('(sbm.batch_id IS NULL OR sbm.batch_id = 0)');
      } else {
        const bId = parseInt(batchFilter, 10);
        if (!isNaN(bId)) {
          whereClauses.push('sbm.batch_id = ?');
          params.push(bId);
        }
      }
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR u.mobile LIKE ?)');
      params.push(q, q, q);
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

    // Order: For interested/scheduled view, sort by slot_order then scheduled_start.
    // Group batch-wise, then candidate name-wise.
    const orderSQL = isInterestedView
      ? `ORDER BY 
          CASE WHEN p.slot_order IS NOT NULL THEN 0 ELSE 1 END,
          p.slot_order ASC,
          p.scheduled_start ASC,
          CASE WHEN b.name IS NOT NULL THEN 0 ELSE 1 END,
          b.name ASC,
          u.name ASC`
      : `ORDER BY 
          CASE WHEN b.name IS NOT NULL THEN 0 ELSE 1 END,
          b.name ASC,
          u.name ASC`;

    const [rows] = await pool.execute(
      `SELECT 
        p.id as participant_id,
        p.mock_interview_id,
        p.student_id,
        p.status,
        p.not_interested_reason,
        p.slot_order,
        TIME_FORMAT(p.scheduled_start, '%H:%i') as scheduled_start,
        TIME_FORMAT(p.scheduled_end, '%H:%i') as scheduled_end,
        p.actual_start,
        p.actual_end,
        p.actual_duration_mins,
        p.completed_at,
        p.feedback_notes,
        p.created_at as participant_created_at,
        p.updated_at as participant_updated_at,
        u.name as student_name,
        u.email as student_email,
        u.mobile as student_mobile,
        u.domain,
        u.college,
        u.passout_year,
        b.id as batch_id,
        COALESCE(b.name, 'Unassigned') as batch_name,
        CASE WHEN b.id IS NOT NULL THEN TRUE ELSE FALSE END as is_assigned
      FROM mock_interview_participants p
      JOIN Users u ON p.student_id = u.id
      LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
      LEFT JOIN Batches b ON sbm.batch_id = b.id
      ${whereSQL}
      ${orderSQL}`,
      params
    );

    return rows;
  }

  /**
   * Update student participation status (Interested, Not Interested, etc.)
   */
  static async updateParticipantStatus(mockInterviewId, studentId, {
    status,
    reason = null,
    feedbackNotes = null
  }) {
    const validStatuses = ['ELIGIBLE', 'INTERESTED', 'NOT_INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const updates = ['status = ?'];
    const params = [status];

    if (reason !== undefined) {
      updates.push('not_interested_reason = ?');
      params.push(reason || null);
    }

    if (feedbackNotes !== undefined) {
      updates.push('feedback_notes = ?');
      params.push(feedbackNotes || null);
    }

    // If changing to NOT_INTERESTED (candidate drop-off or decline), clear slot allocations
    if (status === 'NOT_INTERESTED') {
      updates.push('slot_order = NULL', 'scheduled_start = NULL', 'scheduled_end = NULL');
    } else if (status === 'INTERESTED' && reason === undefined) {
      // If changing back to interested, clear any previous decline reason
      updates.push('not_interested_reason = NULL');
    }

    params.push(mockInterviewId, studentId);

    const [result] = await pool.execute(
      `UPDATE mock_interview_participants 
       SET ${updates.join(', ')} 
       WHERE mock_interview_id = ? AND student_id = ?`,
      params
    );

    return result.affectedRows > 0;
  }

  /**
   * Deterministic Sequential Slot Generation for Interested Students
   * Grouped batch-wise (Batch 1, Batch 2, Batch 3...), and alphabetical by candidate name within each batch
   */
  static async generateSlots(mockInterviewId, { startTime = null, durationMins = null } = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get mock interview default schedule settings
      const [mockRows] = await connection.execute(
        'SELECT start_time, default_duration_mins FROM mock_interview_events WHERE id = ?',
        [mockInterviewId]
      );
      if (mockRows.length === 0) {
        throw new Error('Mock interview not found');
      }

      const effectiveStartTime = startTime || mockRows[0].start_time || '10:00:00';
      const effectiveDuration = parseInt(durationMins || mockRows[0].default_duration_mins, 10) || 20;

      // Fetch all interested students (INTERESTED, SCHEDULED, IN_PROGRESS, COMPLETED) with batch details
      const [participants] = await connection.execute(
        `SELECT p.id, p.student_id, p.status, p.slot_order, u.name,
                b.id as batch_id, b.name as batch_name
         FROM mock_interview_participants p
         JOIN Users u ON p.student_id = u.id
         LEFT JOIN StudentBatchMap sbm ON u.id = sbm.student_id
         LEFT JOIN Batches b ON sbm.batch_id = b.id
         WHERE p.mock_interview_id = ?
           AND p.status IN ('INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')`,
        [mockInterviewId]
      );

      if (participants.length === 0) {
        await connection.commit();
        return { count: 0, slots: [] };
      }

      // Sort batch-wise (Batch 1, Batch 2, Batch 3...), then alphabetical name-wise within each batch
      participants.sort((a, b) => {
        const hasBatchA = Boolean(a.batch_name);
        const hasBatchB = Boolean(b.batch_name);

        // Assigned batches come before unassigned
        if (hasBatchA && !hasBatchB) return -1;
        if (!hasBatchA && hasBatchB) return 1;

        if (hasBatchA && hasBatchB && a.batch_name !== b.batch_name) {
          // Natural alphanumeric sort so "Batch 1" < "Batch 2" < "Batch 10"
          const batchCmp = a.batch_name.localeCompare(b.batch_name, undefined, {
            numeric: true,
            sensitivity: 'base'
          });
          if (batchCmp !== 0) return batchCmp;
        }

        // Within the same batch, order by candidate name (A-Z)
        return (a.name || '').localeCompare(b.name || '', undefined, {
          sensitivity: 'base'
        });
      });

      let currentMinute = MockInterview.timeStringToMinutes(effectiveStartTime);
      const generatedSlots = [];

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const slotOrder = i + 1;
        const slotStartMin = currentMinute;
        const slotEndMin = currentMinute + effectiveDuration;
        currentMinute = slotEndMin;

        const scheduledStart = MockInterview.minutesToTimeString(slotStartMin);
        const scheduledEnd = MockInterview.minutesToTimeString(slotEndMin);

        // Do not downgrade IN_PROGRESS or COMPLETED statuses
        const newStatus = (p.status === 'IN_PROGRESS' || p.status === 'COMPLETED') ? p.status : 'SCHEDULED';

        await connection.execute(
          `UPDATE mock_interview_participants
           SET slot_order = ?, scheduled_start = ?, scheduled_end = ?, status = ?
           WHERE id = ?`,
          [slotOrder, scheduledStart, scheduledEnd, newStatus, p.id]
        );

        generatedSlots.push({
          participant_id: p.id,
          student_id: p.student_id,
          slot_order: slotOrder,
          scheduled_start: scheduledStart.substring(0, 5),
          scheduled_end: scheduledEnd.substring(0, 5),
          batch_name: p.batch_name || 'Unassigned',
          status: newStatus
        });
      }

      await connection.commit();
      return { count: generatedSlots.length, slots: generatedSlots };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Mark Interview Started (records actual start time without touching scheduled slot)
   */
  static async startInterview(mockInterviewId, studentId, { actualStart = null } = {}) {
    const startVal = actualStart ? new Date(actualStart) : new Date();
    const [result] = await pool.execute(
      `UPDATE mock_interview_participants
       SET actual_start = COALESCE(?, NOW()), status = 'IN_PROGRESS'
       WHERE mock_interview_id = ? AND student_id = ?`,
      [actualStart ? startVal : null, mockInterviewId, studentId]
    );

    // Also transition event status to ONGOING if it's currently UPCOMING
    await pool.execute(
      `UPDATE mock_interview_events SET status = 'ONGOING' WHERE id = ? AND status = 'UPCOMING'`,
      [mockInterviewId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Mark Interview Completed (records actual start, end, duration, and completion timestamp)
   */
  static async completeInterview(mockInterviewId, studentId, {
    actualStart = null,
    actualEnd = null,
    feedbackNotes = null
  } = {}) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT actual_start FROM mock_interview_participants 
         WHERE mock_interview_id = ? AND student_id = ?`,
        [mockInterviewId, studentId]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return false;
      }

      const now = new Date();
      const effectiveStart = actualStart ? new Date(actualStart) : (rows[0].actual_start ? new Date(rows[0].actual_start) : now);
      const effectiveEnd = actualEnd ? new Date(actualEnd) : now;

      // Calculate actual duration in minutes
      const diffMs = Math.max(0, effectiveEnd.getTime() - effectiveStart.getTime());
      const durationMins = Math.round(diffMs / (1000 * 60));

      await connection.execute(
        `UPDATE mock_interview_participants
         SET actual_start = ?,
             actual_end = ?,
             actual_duration_mins = ?,
             completed_at = NOW(),
             status = 'COMPLETED',
             feedback_notes = COALESCE(?, feedback_notes)
         WHERE mock_interview_id = ? AND student_id = ?`,
        [effectiveStart, effectiveEnd, durationMins, feedbackNotes || null, mockInterviewId, studentId]
      );

      // Check if all interested students in this event are now completed
      const [remaining] = await connection.execute(
        `SELECT COUNT(*) as remaining_count
         FROM mock_interview_participants
         WHERE mock_interview_id = ?
           AND status IN ('INTERESTED', 'SCHEDULED', 'IN_PROGRESS')`,
        [mockInterviewId]
      );

      if (remaining[0].remaining_count === 0) {
        await connection.execute(
          `UPDATE mock_interview_events SET status = 'COMPLETED' WHERE id = ?`,
          [mockInterviewId]
        );
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
}

module.exports = MockInterview;
