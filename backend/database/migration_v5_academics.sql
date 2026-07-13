-- Migration v5: Attendance and assessment tracking

CREATE TABLE IF NOT EXISTS AttendanceSessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    batch_id INT NULL,
    sub_batch_id INT NULL,
    created_by INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
    FOREIGN KEY (sub_batch_id) REFERENCES SubBatches(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AttendanceRecords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
    remarks TEXT,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES AttendanceSessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance_record (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS Assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    assessment_type ENUM('weekly', 'mock', 'practice') NOT NULL DEFAULT 'weekly',
    assessment_date DATE NOT NULL,
    max_marks DECIMAL(6,2) NOT NULL DEFAULT 100,
    syllabus TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AssessmentResults (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    student_id INT NOT NULL,
    marks_obtained DECIMAL(6,2) NOT NULL DEFAULT 0,
    status ENUM('passed', 'needs_improvement', 'absent') NOT NULL DEFAULT 'needs_improvement',
    feedback TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES Assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assessment_result (assessment_id, student_id)
);
