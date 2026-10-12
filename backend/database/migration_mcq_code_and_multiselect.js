const db = require('../config/db');

async function runMigration() {
  console.log('Running MCQ code snippet and multi-select migration...');
  const connection = await db.getConnection();

  try {
    // 1. exam_questions: update question_type enum to include MULTI_SELECT
    console.log('1. Checking exam_questions.question_type...');
    await connection.query(`
      ALTER TABLE exam_questions 
      MODIFY COLUMN question_type ENUM('WRITTEN','SHORT_ANSWER','MCQ','MULTI_SELECT','TRUE_FALSE','CODE') NOT NULL DEFAULT 'WRITTEN'
    `);
    console.log('✔ exam_questions.question_type updated to include MULTI_SELECT');

    // 2. exam_questions: code_snippet
    const [colsCodeSnippet] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_questions' AND COLUMN_NAME = 'code_snippet'
    `);
    if (colsCodeSnippet.length === 0) {
      await connection.query(`ALTER TABLE exam_questions ADD COLUMN code_snippet MEDIUMTEXT NULL AFTER question_text`);
      console.log('✔ Added code_snippet to exam_questions');
    } else {
      console.log('ℹ code_snippet already exists in exam_questions');
    }

    // 3. exam_questions: code_language
    const [colsCodeLang] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_questions' AND COLUMN_NAME = 'code_language'
    `);
    if (colsCodeLang.length === 0) {
      await connection.query(`ALTER TABLE exam_questions ADD COLUMN code_language VARCHAR(50) NULL AFTER marks`);
      console.log('✔ Added code_language to exam_questions');
    } else {
      console.log('ℹ code_language already exists in exam_questions');
    }

    // 4. exam_questions: code_template
    const [colsCodeTpl] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_questions' AND COLUMN_NAME = 'code_template'
    `);
    if (colsCodeTpl.length === 0) {
      await connection.query(`ALTER TABLE exam_questions ADD COLUMN code_template MEDIUMTEXT NULL AFTER code_language`);
      console.log('✔ Added code_template to exam_questions');
    } else {
      console.log('ℹ code_template already exists in exam_questions');
    }

    // 5. question_bank_questions: update question_type enum & add code_snippet, code_language
    try {
      await connection.query(`
        ALTER TABLE question_bank_questions 
        MODIFY COLUMN question_type ENUM('WRITTEN','SHORT_ANSWER','MCQ','MULTI_SELECT','TRUE_FALSE','CODE') NOT NULL DEFAULT 'WRITTEN'
      `);
      console.log('✔ question_bank_questions.question_type updated to include MULTI_SELECT');

      const [colsQbSnippet] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_bank_questions' AND COLUMN_NAME = 'code_snippet'
      `);
      if (colsQbSnippet.length === 0) {
        await connection.query(`ALTER TABLE question_bank_questions ADD COLUMN code_snippet MEDIUMTEXT NULL AFTER question_text`);
        console.log('✔ Added code_snippet to question_bank_questions');
      }

      const [colsQbLang] = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'question_bank_questions' AND COLUMN_NAME = 'code_language'
      `);
      if (colsQbLang.length === 0) {
        await connection.query(`ALTER TABLE question_bank_questions ADD COLUMN code_language VARCHAR(50) NULL AFTER marks`);
        console.log('✔ Added code_language to question_bank_questions');
      }
    } catch (qbErr) {
      console.warn('Note on question_bank_questions:', qbErr.message);
    }

    // 6. exam_answers: widen selected_option to TEXT
    console.log('6. Widening exam_answers.selected_option to TEXT...');
    await connection.query(`
      ALTER TABLE exam_answers MODIFY COLUMN selected_option TEXT NULL
    `);
    console.log('✔ exam_answers.selected_option widened to TEXT');

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;
