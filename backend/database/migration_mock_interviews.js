const pool = require('../config/db');

async function runMigration() {
  console.log('[Migration] Starting Mock Interviews schema migration...');
  const connection = await pool.getConnection();

  try {
    // 1. mock_interview_events
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mock_interview_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        course_id INT NOT NULL,
        interview_date DATE NOT NULL,
        start_time TIME NOT NULL DEFAULT '10:00:00',
        default_duration_mins INT NOT NULL DEFAULT 20,
        meet_link VARCHAR(500) NULL,
        status ENUM('UPCOMING', 'ONGOING', 'COMPLETED') DEFAULT 'UPCOMING',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_mock_course (course_id),
        INDEX idx_mock_date (interview_date),
        INDEX idx_mock_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: mock_interview_events');

    // 2. mock_interview_batches
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mock_interview_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mock_interview_id INT NOT NULL,
        batch_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_mock_batch (mock_interview_id, batch_id),
        FOREIGN KEY (mock_interview_id) REFERENCES mock_interview_events(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
        INDEX idx_mock_batch_batch (batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: mock_interview_batches');

    // 3. mock_interview_participants
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mock_interview_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mock_interview_id INT NOT NULL,
        student_id INT NOT NULL,
        status ENUM('ELIGIBLE', 'INTERESTED', 'NOT_INTERESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED') DEFAULT 'ELIGIBLE',
        not_interested_reason TEXT NULL,
        slot_order INT NULL,
        scheduled_start TIME NULL,
        scheduled_end TIME NULL,
        actual_start DATETIME NULL,
        actual_end DATETIME NULL,
        actual_duration_mins INT NULL,
        completed_at DATETIME NULL,
        feedback_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_mock_student (mock_interview_id, student_id),
        FOREIGN KEY (mock_interview_id) REFERENCES mock_interview_events(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
        INDEX idx_mock_part_status (status),
        INDEX idx_mock_part_order (slot_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created table: mock_interview_participants');

    console.log('[Migration] Mock Interviews tables successfully initialized!');
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
