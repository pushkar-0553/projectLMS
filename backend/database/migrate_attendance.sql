-- 1. Batches table
CREATE TABLE IF NOT EXISTS Batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coordinator_id INT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coordinator_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- 2. StudentBatchMap — links students to batches
CREATE TABLE IF NOT EXISTS StudentBatchMap (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  batch_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT,
  FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES Users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_student_batch (student_id, batch_id)
);

-- 3. AttendanceSessions — one per day per batch
CREATE TABLE IF NOT EXISTS AttendanceSessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  session_date DATE NOT NULL,
  topic_covered VARCHAR(500),
  notes TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_batch_date (batch_id, session_date)
);

-- 4. AttendanceRecords — per student per session
CREATE TABLE IF NOT EXISTS AttendanceRecords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'absent',
  marked_by INT,
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  remarks VARCHAR(500),
  FOREIGN KEY (session_id) REFERENCES AttendanceSessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES Users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_session_student (session_id, student_id)
);
