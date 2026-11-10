const pool = require('../config/db');

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function runAttendanceMigration() {
  console.log('[Migration] Starting Attendance Management Module schema migration...');
  const connection = await pool.getConnection();

  try {
    // 1. Add attendance_pin_hash and attendance_pin_updated_at to existing Users table if missing
    if (!(await columnExists(connection, 'Users', 'attendance_pin_hash'))) {
      console.log('[Migration] Adding attendance_pin_hash column to Users...');
      await connection.query(`
        ALTER TABLE Users
        ADD COLUMN attendance_pin_hash VARCHAR(255) NULL AFTER password
      `);
    } else {
      console.log('[Migration] Users.attendance_pin_hash already exists.');
    }

    if (!(await columnExists(connection, 'Users', 'attendance_pin_updated_at'))) {
      console.log('[Migration] Adding attendance_pin_updated_at column to Users...');
      await connection.query(`
        ALTER TABLE Users
        ADD COLUMN attendance_pin_updated_at TIMESTAMP NULL AFTER attendance_pin_hash
      `);
    } else {
      console.log('[Migration] Users.attendance_pin_updated_at already exists.');
    }

    // 2. Create attendance_settings
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(64) NOT NULL,
        network_display_name VARCHAR(255) NOT NULL DEFAULT 'Institute Campus Wi-Fi',
        allowed_ipv4 JSON NULL,
        allowed_ipv6 JSON NULL,
        allowed_cidrs JSON NULL,
        offline_attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        online_attendance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        device_restriction_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_att_settings_key (setting_key),
        FOREIGN KEY (updated_by) REFERENCES Users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created/verified table: attendance_settings');

    // Seed default settings row if missing
    await connection.query(`
      INSERT IGNORE INTO attendance_settings (
        setting_key,
        network_display_name,
        allowed_ipv4,
        allowed_ipv6,
        allowed_cidrs,
        offline_attendance_enabled,
        online_attendance_enabled,
        device_restriction_enabled
      ) VALUES (
        'DEFAULT',
        'Institute Campus Wi-Fi',
        JSON_ARRAY(),
        JSON_ARRAY(),
        JSON_ARRAY(),
        TRUE,
        TRUE,
        TRUE
      );
    `);

    // 3. Create attendance_sessions (Online attendance sessions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NULL,
        batch_id INT NOT NULL,
        session_date DATE NOT NULL,
        title VARCHAR(255) NULL,
        session_code VARCHAR(32) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at DATETIME NOT NULL,
        created_by INT NULL,
        deactivated_by INT NULL,
        deactivated_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_att_session_code (session_code),
        FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE SET NULL,
        FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL,
        FOREIGN KEY (deactivated_by) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_att_sess_batch_date (batch_id, session_date),
        INDEX idx_att_sess_date (session_date),
        INDEX idx_att_sess_active_exp (is_active, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created/verified table: attendance_sessions');

    // 4. Create attendance_devices
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        device_uuid VARCHAR(64) NOT NULL,
        student_id INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        active_device_uuid VARCHAR(64) NULL,
        active_student_id INT NULL,
        user_agent VARCHAR(512) NULL,
        registered_ip VARCHAR(45) NULL,
        last_ip VARCHAR(45) NULL,
        registered_at DATETIME NOT NULL,
        last_activity_at DATETIME NOT NULL,
        reset_at DATETIME NULL,
        reset_by INT NULL,
        reset_reason VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_att_active_device_uuid (active_device_uuid),
        UNIQUE KEY uk_att_active_student_id (active_student_id),
        FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (reset_by) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_att_dev_uuid (device_uuid),
        INDEX idx_att_dev_student (student_id),
        INDEX idx_att_dev_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created/verified table: attendance_devices');

    // 5. Create attendance_records
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        batch_id INT NULL,
        course_id INT NULL,
        attendance_date DATE NOT NULL,
        attendance_mode ENUM('OFFLINE', 'ONLINE') NOT NULL,
        status ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') NOT NULL DEFAULT 'PRESENT',
        source ENUM('SELF_PORTAL', 'ADMIN_MANUAL') NOT NULL DEFAULT 'SELF_PORTAL',
        session_id INT NULL,
        device_record_id INT NULL,
        device_uuid VARCHAR(64) NULL,
        ip_address VARCHAR(45) NULL,
        ip_binary VARBINARY(16) NULL,
        submitted_at DATETIME NOT NULL,
        marked_by_admin_id INT NULL,
        correction_reason VARCHAR(500) NULL,
        is_manually_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
        adjusted_at DATETIME NULL,
        original_evidence JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_att_student_date (student_id, attendance_date),
        FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
        FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE SET NULL,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (device_record_id) REFERENCES attendance_devices(id) ON DELETE SET NULL,
        FOREIGN KEY (marked_by_admin_id) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_att_rec_date (attendance_date),
        INDEX idx_att_rec_batch_date (batch_id, attendance_date),
        INDEX idx_att_rec_student (student_id),
        INDEX idx_att_rec_mode_date (attendance_mode, attendance_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created/verified table: attendance_records');

    // 6. Create attendance_audit_logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(64) NOT NULL,
        actor_admin_id INT NULL,
        target_student_id INT NULL,
        target_record_id INT NULL,
        target_device_id INT NULL,
        target_session_id INT NULL,
        reason VARCHAR(500) NULL,
        actor_ip VARCHAR(45) NULL,
        before_state JSON NULL,
        after_state JSON NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (actor_admin_id) REFERENCES Users(id) ON DELETE SET NULL,
        FOREIGN KEY (target_student_id) REFERENCES Users(id) ON DELETE SET NULL,
        INDEX idx_att_audit_action (action_type),
        INDEX idx_att_audit_admin (actor_admin_id),
        INDEX idx_att_audit_student (target_student_id),
        INDEX idx_att_audit_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[Migration] Created/verified table: attendance_audit_logs');

    console.log('[Migration] Attendance Management Module migration completed successfully!');
  } catch (err) {
    console.error('[Migration] Migration failed:', err);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  runAttendanceMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runAttendanceMigration };

