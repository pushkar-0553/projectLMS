-- Simple Platform Migration Script (No Foreign Keys)
-- Student Execution & Mentorship Platform

-- =============================================
-- STEP 1: CREATE NEW PLATFORM TABLES
-- =============================================

-- Faculty table
CREATE TABLE IF NOT EXISTS Faculty (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    specialization VARCHAR(255),
    experience_years INT DEFAULT 0,
    qualification VARCHAR(255),
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_sessions INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id),
    INDEX idx_rating (rating)
);

-- Batches table
CREATE TABLE IF NOT EXISTS Batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    coordinator_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    max_students INT DEFAULT 50,
    current_students INT DEFAULT 0,
    status ENUM('active', 'completed', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coordinator (coordinator_id),
    INDEX idx_status (status)
);

-- StudentBatches table
CREATE TABLE IF NOT EXISTS StudentBatches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    status ENUM('active', 'completed', 'dropped', 'transferred') DEFAULT 'active',
    performance_score DECIMAL(5,2) DEFAULT 0.00,
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_student_batch (student_id, batch_id),
    INDEX idx_student (student_id),
    INDEX idx_batch (batch_id),
    INDEX idx_status (status)
);

-- ProjectSteps table
CREATE TABLE IF NOT EXISTS ProjectSteps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    step_order INT NOT NULL,
    estimated_hours INT DEFAULT 0,
    is_mandatory TINYINT(1) DEFAULT 1,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project (project_id),
    INDEX idx_order (project_id, step_order)
);

-- StudentProjects table
CREATE TABLE IF NOT EXISTS StudentProjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    project_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    status ENUM('assigned', 'in_progress', 'completed', 'overdue') DEFAULT 'assigned',
    completion_percentage INT DEFAULT 0,
    score DECIMAL(5,2) DEFAULT 0.00,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student (student_id),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);

-- StepProgress table
CREATE TABLE IF NOT EXISTS StepProgress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_project_id INT NOT NULL,
    step_id INT NOT NULL,
    status ENUM('not_started', 'in_progress', 'completed', 'blocked') DEFAULT 'not_started',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    time_spent_minutes INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_step_progress (student_project_id, step_id),
    INDEX idx_student_project (student_project_id),
    INDEX idx_step (step_id),
    INDEX idx_status (status)
);

-- Live Sessions table
CREATE TABLE IF NOT EXISTS LiveSessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    session_type ENUM('class', 'mock_interview', 'mentoring', 'meeting') NOT NULL,
    session_status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
    host_id INT NOT NULL,
    batch_id INT,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP NULL,
    actual_end TIMESTAMP NULL,
    meeting_link VARCHAR(500),
    meeting_id VARCHAR(100),
    max_participants INT DEFAULT 50,
    current_participants INT DEFAULT 0,
    recording_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_host (host_id),
    INDEX idx_batch (batch_id),
    INDEX idx_type (session_type),
    INDEX idx_status (session_status),
    INDEX idx_scheduled (scheduled_start, scheduled_end)
);

-- Session Participants table
CREATE TABLE IF NOT EXISTS SessionParticipants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    participant_id INT NOT NULL,
    join_time TIMESTAMP NULL,
    leave_time TIMESTAMP NULL,
    duration_minutes INT DEFAULT 0,
    attendance_status ENUM('present', 'partial', 'absent') DEFAULT 'absent',
    participation_score DECIMAL(5,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_session_participant (session_id, participant_id),
    INDEX idx_session (session_id),
    INDEX idx_participant (participant_id),
    INDEX idx_attendance (attendance_status)
);

-- Interview Evaluations table
CREATE TABLE IF NOT EXISTS InterviewEvaluations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    evaluator_id INT NOT NULL,
    student_id INT NOT NULL,
    communication_score INT DEFAULT 0,
    technical_score INT DEFAULT 0,
    confidence_score INT DEFAULT 0,
    problem_solving_score INT DEFAULT 0,
    overall_score INT DEFAULT 0,
    strengths TEXT,
    weaknesses TEXT,
    recommendations TEXT,
    final_feedback TEXT,
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_interview_eval (session_id, student_id),
    INDEX idx_session (session_id),
    INDEX idx_evaluator (evaluator_id),
    INDEX idx_student (student_id),
    INDEX idx_overall_score (overall_score)
);

-- Student Performance table
CREATE TABLE IF NOT EXISTS StudentPerformance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    metric_date DATE NOT NULL,
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    task_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    participation_score DECIMAL(5,2) DEFAULT 0.00,
    execution_score DECIMAL(5,2) DEFAULT 0.00,
    classes_attended INT DEFAULT 0,
    classes_total INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_assigned INT DEFAULT 0,
    interviews_completed INT DEFAULT 0,
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    last_activity TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_daily_metric (student_id, metric_date),
    INDEX idx_student (student_id),
    INDEX idx_batch (batch_id),
    INDEX idx_date (metric_date),
    INDEX idx_risk_level (risk_level)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS Notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('class_reminder', 'deadline', 'interview', 'feedback', 'alert', 'general') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    is_read TINYINT(1) DEFAULT 0,
    action_url VARCHAR(500),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_recipient (recipient_id),
    INDEX idx_type (notification_type),
    INDEX idx_priority (priority),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
);

-- System Settings table
CREATE TABLE IF NOT EXISTS SystemSettings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public TINYINT(1) DEFAULT 0,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
);

-- =============================================
-- STEP 2: MIGRATE EXISTING DATA
-- =============================================

-- Create default batch
INSERT IGNORE INTO Batches (name, coordinator_id, start_date, end_date)
SELECT 
    'Default Batch', 
    (SELECT MIN(id) FROM Users WHERE role = 'coordinator' LIMIT 1),
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
WHERE EXISTS (SELECT 1 FROM Users WHERE role = 'coordinator');

-- Assign existing students to default batch
INSERT IGNORE INTO StudentBatches (student_id, batch_id, enrollment_date)
SELECT 
    u.id,
    (SELECT id FROM Batches WHERE name = 'Default Batch' LIMIT 1),
    CURDATE()
FROM Users u
WHERE u.role = 'student'
AND EXISTS (SELECT 1 FROM Batches WHERE name = 'Default Batch');

-- Migrate existing Steps to ProjectSteps
INSERT IGNORE INTO ProjectSteps (project_id, title, step_order, estimated_hours, images)
SELECT 
    s.project_id,
    s.title,
    s.step_order,
    10, -- Default estimated hours
    s.images
FROM Steps s
WHERE NOT EXISTS (SELECT 1 FROM ProjectSteps ps WHERE ps.project_id = s.project_id AND ps.step_order = s.step_order);

-- Insert system settings
INSERT IGNORE INTO SystemSettings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_name', 'Student Execution & Mentorship Platform', 'string', 'Platform name', 1),
('max_session_duration', '180', 'number', 'Maximum session duration in minutes', 0),
('attendance_threshold', '75', 'number', 'Minimum attendance percentage', 1),
('auto_attendance_enabled', 'true', 'string', 'Enable automatic attendance tracking', 0),
('notification_email_enabled', 'false', 'string', 'Enable email notifications', 0),
('maintenance_mode', 'false', 'string', 'Platform maintenance mode', 0);

-- Create faculty records for coordinators
INSERT IGNORE INTO Faculty (user_id, employee_id, department, specialization, experience_years)
SELECT 
    u.id,
    CONCAT('FAC', LPAD(u.id, 4, '0')),
    'General Department',
    'Education & Mentoring',
    5
FROM Users u
WHERE u.role = 'coordinator';

SELECT 'Simple platform migration completed successfully!' as status;
