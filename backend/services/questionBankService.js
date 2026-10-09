const db = require('../config/db');

async function listCategories() {
  const [rows] = await db.query(`SELECT * FROM question_bank_categories ORDER BY name ASC`);
  return rows;
}

async function createCategory(data) {
  const { name, description = '', parentId = null } = data;
  const [result] = await db.query(`
    INSERT INTO question_bank_categories (name, description, parent_id)
    VALUES (?, ?, ?)
  `, [name, description, parentId]);
  return { id: result.insertId, name, description, parentId };
}

async function listQuestions({ categoryId = null, difficulty = null, questionType = null, search = '' } = {}) {
  let sql = `
    SELECT q.*, c.name as category_name
    FROM question_bank_questions q
    LEFT JOIN question_bank_categories c ON q.category_id = c.id
    WHERE q.is_active = 1
  `;
  const params = [];

  if (categoryId) {
    sql += ' AND q.category_id = ?';
    params.push(categoryId);
  }
  if (difficulty) {
    sql += ' AND q.difficulty = ?';
    params.push(difficulty);
  }
  if (questionType) {
    sql += ' AND q.question_type = ?';
    params.push(questionType);
  }
  if (search) {
    sql += ' AND (q.question_text LIKE ? OR q.topic LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY q.created_at DESC';
  const [rows] = await db.query(sql, params);
  return rows.map(r => {
    let options = null;
    if (r.options_json) {
      try { options = typeof r.options_json === 'string' ? JSON.parse(r.options_json) : r.options_json; } catch(e){}
    }
    return { ...r, options };
  });
}

async function createQuestion(data) {
  const {
    categoryId = null,
    questionType = 'WRITTEN',
    difficulty = 'MEDIUM',
    topic = '',
    questionText,
    options = null,
    answerKey = '',
    explanation = '',
    marks = 5,
    attachmentUrl = null
  } = data;

  const optionsJson = options ? JSON.stringify(options) : null;
  const [result] = await db.query(`
    INSERT INTO question_bank_questions 
      (category_id, question_type, difficulty, topic, question_text, options_json, answer_key, explanation, marks, attachment_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [categoryId, questionType, difficulty, topic, questionText, optionsJson, answerKey, explanation, marks, attachmentUrl]);

  return { id: result.insertId };
}

module.exports = {
  listCategories,
  createCategory,
  listQuestions,
  createQuestion
};
