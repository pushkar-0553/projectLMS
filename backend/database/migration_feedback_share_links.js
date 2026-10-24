const pool = require('../config/db');

async function runShareMigration() {
  console.log('[Migration] Starting Feedback Student Links & Share Tokens migration...');
  const connection = await pool.getConnection();

  try {
    // 1. feedback_student_links table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedback_student_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        feedback_id INT NOT NULL,
        student_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        status ENUM('PENDING', 'SUBMITTED', 'EDIT_REQUESTED', 'EDIT_ALLOWED') NOT NULL DEFAULT 'PENDING',
        edit_requested_at DATETIME NULL,
        edit_request_reason TEXT NULL,
        edit_granted_at DATETIME NULL,
        edit_granted_by INT NULL,
        submitted_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_fb_student_link (feedback_id, student_id),
        INDEX idx_fbsl_token (token),
        INDEX idx_fbsl_status (feedback_id, status),
        FOREIGN KEY (feedback_id) REFERENCES feedback_campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (edit_granted_by) REFERENCES Users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: feedback_student_links');

    console.log('[Migration] Feedback Share Tokens migration completed successfully!');
  } catch (err) {
    console.error('[Migration] Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

runShareMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
