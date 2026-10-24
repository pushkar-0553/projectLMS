const pool = require('../config/db');

async function runMigration() {
  console.log('[Migration] Starting Student Feedback Module schema migration...');
  const connection = await pool.getConnection();

  try {
    // 1. feedback_campaigns
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        course_id INT NOT NULL,
        feedback_date DATE NOT NULL,
        status ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED') DEFAULT 'ACTIVE',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_fb_course (course_id),
        INDEX idx_fb_date (feedback_date),
        INDEX idx_fb_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: feedback_campaigns');

    // 2. feedback_batches
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        feedback_id INT NOT NULL,
        batch_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_feedback_batch (feedback_id, batch_id),
        FOREIGN KEY (feedback_id) REFERENCES feedback_campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
        INDEX idx_fb_batch_batch (batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: feedback_batches');

    // 3. feedback_questions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        feedback_id INT NOT NULL,
        question_text TEXT NOT NULL,
        question_type ENUM('TEXT', 'LONG_TEXT', 'RATING', 'SINGLE_CHOICE') NOT NULL DEFAULT 'TEXT',
        options JSON NULL,
        question_order INT NOT NULL DEFAULT 1,
        is_required BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (feedback_id) REFERENCES feedback_campaigns(id) ON DELETE CASCADE,
        INDEX idx_fb_question_order (feedback_id, question_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: feedback_questions');

    // 4. feedback_responses
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        feedback_id INT NOT NULL,
        student_id INT NOT NULL,
        batch_id INT NULL,
        status ENUM('PENDING', 'COMPLETED') DEFAULT 'COMPLETED',
        overall_feedback TEXT NULL,
        submitted_by INT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_feedback_student (feedback_id, student_id),
        FOREIGN KEY (feedback_id) REFERENCES feedback_campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
        FOREIGN KEY (submitted_by) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_fb_resp_status (feedback_id, status),
        INDEX idx_fb_resp_student (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: feedback_responses');

    // 5. feedback_answers
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        response_id INT NOT NULL,
        question_id INT NOT NULL,
        answer_text TEXT NULL,
        rating_value INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_response_question (response_id, question_id),
        FOREIGN KEY (response_id) REFERENCES feedback_responses(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES feedback_questions(id) ON DELETE CASCADE,
        INDEX idx_fb_ans_question (question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: feedback_answers');

    console.log('[Migration] Feedback Module tables successfully initialized!');
  } catch (err) {
    console.error('[Migration] Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
