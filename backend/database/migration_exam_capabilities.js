const db = require('../config/db');

async function runMigration() {
  console.log('Running exam capabilities migration...');
  const connection = await db.getConnection();
  try {
    // 1. exam_sections: default_capabilities
    const [colsSec] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_sections' AND COLUMN_NAME = 'default_capabilities'
    `);
    if (colsSec.length === 0) {
      await connection.query(`ALTER TABLE exam_sections ADD COLUMN default_capabilities JSON NULL AFTER total_marks`);
      console.log('✔ Added default_capabilities to exam_sections');
    } else {
      console.log('ℹ default_capabilities already exists in exam_sections');
    }

    // 2. exam_questions: capabilities_override
    const [colsQ] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_questions' AND COLUMN_NAME = 'capabilities_override'
    `);
    if (colsQ.length === 0) {
      await connection.query(`ALTER TABLE exam_questions ADD COLUMN capabilities_override JSON NULL AFTER attachment_url`);
      console.log('✔ Added capabilities_override to exam_questions');
    } else {
      console.log('ℹ capabilities_override already exists in exam_questions');
    }

    // 3. exam_answers: code_language & code_content
    const [colsAnsLang] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_answers' AND COLUMN_NAME = 'code_language'
    `);
    if (colsAnsLang.length === 0) {
      await connection.query(`ALTER TABLE exam_answers ADD COLUMN code_language VARCHAR(50) NULL AFTER selected_option`);
      console.log('✔ Added code_language to exam_answers');
    } else {
      console.log('ℹ code_language already exists in exam_answers');
    }

    const [colsAnsCode] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exam_answers' AND COLUMN_NAME = 'code_content'
    `);
    if (colsAnsCode.length === 0) {
      await connection.query(`ALTER TABLE exam_answers ADD COLUMN code_content MEDIUMTEXT NULL AFTER code_language`);
      console.log('✔ Added code_content to exam_answers');
    } else {
      console.log('ℹ code_content already exists in exam_answers');
    }

    // 4. search query logs table (for audit/rate-limiting/monitoring)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_search_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        candidate_id INT NOT NULL,
        question_id INT NULL,
        query VARCHAR(500) NOT NULL,
        provider VARCHAR(50) NOT NULL DEFAULT 'duckduckgo',
        result_count INT DEFAULT 0,
        response_time_ms INT DEFAULT 0,
        ip_address VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session (session_id),
        INDEX idx_candidate (candidate_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✔ Checked/created exam_search_logs table');

    // 5. ai assistant logs table (for audit/rate-limiting/monitoring)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_ai_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        candidate_id INT NOT NULL,
        question_id INT NULL,
        prompt_text TEXT NOT NULL,
        response_text TEXT NULL,
        model_used VARCHAR(100) NULL,
        tokens_used INT DEFAULT 0,
        response_time_ms INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session (session_id),
        INDEX idx_candidate (candidate_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✔ Checked/created exam_ai_logs table');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigration();
