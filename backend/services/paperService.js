const db = require('../config/db');
const { logAudit } = require('./auditService');

/**
 * List all master question papers
 */
async function listPapers({ status = null, search = '', courseId = null } = {}) {
  let sql = `
    SELECT 
      p.id,
      p.title,
      p.description,
      p.subject,
      p.course_id,
      p.instructions,
      p.duration_minutes,
      p.total_marks,
      p.status,
      p.created_at,
      p.updated_at,
      (SELECT COUNT(*) FROM exam_paper_versions pv WHERE pv.paper_id = p.id) as version_count,
      (SELECT MAX(pv.version_number) FROM exam_paper_versions pv WHERE pv.paper_id = p.id) as latest_version,
      (SELECT COUNT(*) FROM exam_assignments ea JOIN exam_paper_versions pv ON ea.paper_version_id = pv.id WHERE pv.paper_id = p.id) as assignment_count
    FROM exam_papers p
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (p.title LIKE ? OR p.subject LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (courseId) {
    sql += ' AND (p.course_id = ? OR p.course_id IS NULL)';
    params.push(courseId);
  }

  sql += ' ORDER BY p.updated_at DESC';
  const [rows] = await db.query(sql, params);
  return rows;
}

/**
 * Create a new question paper with initial Version 1, sections, and questions
 */
async function createPaper(data, userId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      title,
      description = '',
      subject = '',
      courseId = null,
      instructions = '',
      durationMinutes = 60,
      sections = []
    } = data;

    // 1. Calculate total marks from sections & questions
    let calculatedTotalMarks = 0;
    sections.forEach(sec => {
      (sec.questions || []).forEach(q => {
        calculatedTotalMarks += parseFloat(q.marks || 0);
      });
    });

    const totalMarks = calculatedTotalMarks > 0 ? calculatedTotalMarks : (data.totalMarks || 100);

    // 2. Insert into exam_papers
    const [paperResult] = await connection.query(`
      INSERT INTO exam_papers 
        (title, description, subject, course_id, instructions, duration_minutes, total_marks, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
    `, [title, description, subject, courseId, instructions, durationMinutes, totalMarks, userId]);

    const paperId = paperResult.insertId;

    // 3. Create Version 1 in exam_paper_versions
    const [versionResult] = await connection.query(`
      INSERT INTO exam_paper_versions
        (paper_id, version_number, title, description, instructions, duration_minutes, total_marks, is_published, created_by)
      VALUES (?, 1, ?, ?, ?, ?, ?, 0, ?)
    `, [paperId, title, description, instructions, durationMinutes, totalMarks, userId]);

    const versionId = versionResult.insertId;

    // 4. Insert Sections and Questions
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      let secMarks = 0;
      (sec.questions || []).forEach(q => { secMarks += parseFloat(q.marks || 0); });

      const [secResult] = await connection.query(`
        INSERT INTO exam_sections 
          (paper_version_id, title, description, instructions, section_order, total_marks)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [versionId, sec.title || `Section ${String.fromCharCode(65 + sIdx)}`, sec.description || '', sec.instructions || '', sIdx + 1, secMarks]);

      const sectionId = secResult.insertId;

      for (let qIdx = 0; qIdx < (sec.questions || []).length; qIdx++) {
        const q = sec.questions[qIdx];
        const optionsJson = q.options ? JSON.stringify(q.options) : null;

        await connection.query(`
          INSERT INTO exam_questions 
            (section_id, question_bank_id, question_order, question_type, difficulty, question_text, options_json, answer_key, explanation, marks, attachment_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sectionId,
          q.questionBankId || null,
          qIdx + 1,
          q.questionType || 'WRITTEN',
          q.difficulty || 'MEDIUM',
          q.questionText || '',
          optionsJson,
          q.answerKey || '',
          q.explanation || '',
          parseFloat(q.marks || 5),
          q.attachmentUrl || null
        ]);
      }
    }

    // 5. Save content snapshot into version
    const fullVersionData = await getVersionDetails(versionId, connection);
    await connection.query(`
      UPDATE exam_paper_versions 
      SET content_snapshot_json = ? 
      WHERE id = ?
    `, [JSON.stringify(fullVersionData), versionId]);

    await connection.commit();

    await logAudit({
      actorType: 'ADMIN',
      actorId: userId,
      action: 'PAPER_CREATED',
      entityType: 'EXAM_PAPER',
      entityId: paperId,
      payload: { title, versionNumber: 1, totalMarks }
    });

    return { paperId, versionId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Get full details of a specific paper version (including sections and questions)
 */
async function getVersionDetails(versionId, conn = null) {
  const runner = conn || db;
  const [versions] = await runner.query(`
    SELECT pv.*, p.subject, p.course_id, p.status as paper_status
    FROM exam_paper_versions pv
    JOIN exam_papers p ON pv.paper_id = p.id
    WHERE pv.id = ?
  `, [versionId]);

  if (versions.length === 0) return null;
  const version = versions[0];

  const [sections] = await runner.query(`
    SELECT * FROM exam_sections 
    WHERE paper_version_id = ? 
    ORDER BY section_order ASC
  `, [versionId]);

  for (const sec of sections) {
    const [questions] = await runner.query(`
      SELECT * FROM exam_questions 
      WHERE section_id = ? 
      ORDER BY question_order ASC
    `, [sec.id]);

    sec.questions = questions.map(q => {
      let parsedOptions = null;
      if (q.options_json) {
        try {
          parsedOptions = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
        } catch (e) {
          parsedOptions = null;
        }
      }
      return {
        ...q,
        options: parsedOptions
      };
    });
  }

  version.sections = sections;
  return version;
}

/**
 * Get a paper by ID with its latest version details
 */
async function getPaperById(paperId) {
  const [papers] = await db.query(`SELECT * FROM exam_papers WHERE id = ?`, [paperId]);
  if (papers.length === 0) return null;
  const paper = papers[0];

  const [versions] = await db.query(`
    SELECT id, version_number, title, total_marks, duration_minutes, is_published, created_at
    FROM exam_paper_versions 
    WHERE paper_id = ? 
    ORDER BY version_number DESC
  `, [paperId]);

  paper.versions = versions;
  if (versions.length > 0) {
    paper.latestVersion = await getVersionDetails(versions[0].id);
  }
  return paper;
}

/**
 * Duplicate a paper or create a new version of an existing paper
 */
async function createNewVersion(paperId, data, userId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check existing versions
    const [[{ maxVersion }]] = await connection.query(`
      SELECT COALESCE(MAX(version_number), 0) as maxVersion 
      FROM exam_paper_versions 
      WHERE paper_id = ?
    `, [paperId]);

    const newVersionNumber = maxVersion + 1;
    const {
      title,
      description = '',
      instructions = '',
      durationMinutes = 60,
      sections = []
    } = data;

    let totalMarks = 0;
    sections.forEach(sec => {
      (sec.questions || []).forEach(q => { totalMarks += parseFloat(q.marks || 0); });
    });

    const [vResult] = await connection.query(`
      INSERT INTO exam_paper_versions 
        (paper_id, version_number, title, description, instructions, duration_minutes, total_marks, is_published, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [paperId, newVersionNumber, title, description, instructions, durationMinutes, totalMarks, userId]);

    const newVersionId = vResult.insertId;

    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      let secMarks = 0;
      (sec.questions || []).forEach(q => { secMarks += parseFloat(q.marks || 0); });

      const [secResult] = await connection.query(`
        INSERT INTO exam_sections 
          (paper_version_id, title, description, instructions, section_order, total_marks)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [newVersionId, sec.title || `Section ${String.fromCharCode(65 + sIdx)}`, sec.description || '', sec.instructions || '', sIdx + 1, secMarks]);

      const sectionId = secResult.insertId;

      for (let qIdx = 0; qIdx < (sec.questions || []).length; qIdx++) {
        const q = sec.questions[qIdx];
        const optionsJson = q.options ? JSON.stringify(q.options) : null;

        await connection.query(`
          INSERT INTO exam_questions 
            (section_id, question_bank_id, question_order, question_type, difficulty, question_text, options_json, answer_key, explanation, marks, attachment_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sectionId,
          q.questionBankId || null,
          qIdx + 1,
          q.questionType || 'WRITTEN',
          q.difficulty || 'MEDIUM',
          q.questionText || '',
          optionsJson,
          q.answerKey || '',
          q.explanation || '',
          parseFloat(q.marks || 5),
          q.attachmentUrl || null
        ]);
      }
    }

    const fullVersionData = await getVersionDetails(newVersionId, connection);
    await connection.query(`
      UPDATE exam_paper_versions 
      SET content_snapshot_json = ? 
      WHERE id = ?
    `, [JSON.stringify(fullVersionData), newVersionId]);

    // Update master paper updated_at and marks
    await connection.query(`
      UPDATE exam_papers 
      SET title = ?, total_marks = ?, duration_minutes = ?
      WHERE id = ?
    `, [title, totalMarks, durationMinutes, paperId]);

    await connection.commit();

    await logAudit({
      actorType: 'ADMIN',
      actorId: userId,
      action: 'PAPER_VERSION_CREATED',
      entityType: 'EXAM_PAPER_VERSION',
      entityId: newVersionId,
      payload: { paperId, versionNumber: newVersionNumber }
    });

    return { paperId, versionId: newVersionId, versionNumber: newVersionNumber };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Publish a paper version to mark it READY for batch assignments
 */
async function publishVersion(versionId, userId) {
  const [versions] = await db.query(`SELECT paper_id FROM exam_paper_versions WHERE id = ?`, [versionId]);
  if (versions.length === 0) throw new Error('Version not found.');

  await db.query(`UPDATE exam_paper_versions SET is_published = 1 WHERE id = ?`, [versionId]);
  await db.query(`UPDATE exam_papers SET status = 'READY' WHERE id = ?`, [versions[0].paper_id]);

  await logAudit({
    actorType: 'ADMIN',
    actorId: userId,
    action: 'PAPER_VERSION_PUBLISHED',
    entityType: 'EXAM_PAPER_VERSION',
    entityId: versionId
  });

  return { success: true };
}

module.exports = {
  listPapers,
  createPaper,
  getPaperById,
  getVersionDetails,
  createNewVersion,
  publishVersion
};
