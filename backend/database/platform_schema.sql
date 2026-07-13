-- Student Execution & Mentorship Platform - Complete Database Schema
-- Version 1.0

-- =============================================
-- CORE USER SYSTEM
-- =============================================

-- Enhanced Users table with role-based permissions
CREATE TABLE Users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'coordinator', 'faculty', 'student') NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- Faculty specific information
CREATE TABLE Faculty (
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
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_employee_id (employee_id),
    INDEX idx_rating (rating)
);

-- =============================================
-- BATCH MANAGEMENT
-- =============================================

-- Batches for organizing students
CREATE TABLE Batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    coordinator_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    max_students INT DEFAULT 50,
    current_students INT DEFAULT 0,
    status ENUM('active', 'completed', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (coordinator_id) REFERENCES Users(id),
    INDEX idx_coordinator (coordinator_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
);

-- Student batch assignments
CREATE TABLE StudentBatches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    status ENUM('active', 'completed', 'dropped', 'transferred') DEFAULT 'active',
    performance_score DECIMAL(5,2) DEFAULT 0.00,
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_batch (student_id, batch_id),
    INDEX idx_student (student_id),
    INDEX idx_batch (batch_id),
    INDEX idx_status (status)
);

-- =============================================
-- PROJECT & TASK MANAGEMENT
-- =============================================

-- Projects
CREATE TABLE Projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    estimated_hours INT DEFAULT 0,
    tags JSON,
    created_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES Users(id),
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_created_by (created_by)
);

-- Project steps/tasks
CREATE TABLE ProjectSteps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INT NOT NULL,
    estimated_hours INT DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT TRUE,
    resources JSON,
    images JSON,
    
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_order (project_id, step_order)
);

-- Student project assignments
CREATE TABLE StudentProjects (
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
    
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES Users(id),
    INDEX idx_student (student_id),
    INDEX idx_project (project_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
);

-- Student step progress
CREATE TABLE StepProgress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_project_id INT NOT NULL,
    step_id INT NOT NULL,
    status ENUM('not_started', 'in_progress', 'completed', 'blocked') DEFAULT 'not_started',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    time_spent_minutes INT DEFAULT 0,
    notes TEXT,
    
    FOREIGN KEY (student_project_id) REFERENCES StudentProjects(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES ProjectSteps(id) ON DELETE CASCADE,
    UNIQUE KEY unique_step_progress (student_project_id, step_id),
    INDEX idx_student_project (student_project_id),
    INDEX idx_step (step_id),
    INDEX idx_status (status)
);

-- =============================================
-- LIVE CLASSROOM SYSTEM
-- =============================================

-- Live sessions (classes, interviews, etc.)
CREATE TABLE LiveSessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
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
    recording_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (host_id) REFERENCES Users(id),
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
    INDEX idx_host (host_id),
    INDEX idx_batch (batch_id),
    INDEX idx_type (session_type),
    INDEX idx_status (session_status),
    INDEX idx_scheduled (scheduled_start, scheduled_end)
);

-- Session participants
CREATE TABLE SessionParticipants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    participant_id INT NOT NULL,
    join_time TIMESTAMP NULL,
    leave_time TIMESTAMP NULL,
    duration_minutes INT DEFAULT 0,
    attendance_status ENUM('present', 'partial', 'absent') DEFAULT 'absent',
    participation_score DECIMAL(5,2) DEFAULT 0.00,
    notes TEXT,
    
    FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_participant (session_id, participant_id),
    INDEX idx_session (session_id),
    INDEX idx_participant (participant_id),
    INDEX idx_attendance (attendance_status)
);

-- =============================================
-- MOCK INTERVIEW SYSTEM
-- =============================================

-- Interview evaluations
CREATE TABLE InterviewEvaluations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    evaluator_id INT NOT NULL,
    student_id INT NOT NULL,
    
    -- Evaluation criteria (1-10 scale)
    communication_score INT DEFAULT 0,
    technical_score INT DEFAULT 0,
    confidence_score INT DEFAULT 0,
    problem_solving_score INT DEFAULT 0,
    overall_score INT DEFAULT 0,
    
    -- Detailed feedback
    strengths TEXT,
    weaknesses TEXT,
    recommendations TEXT,
    final_feedback TEXT,
    
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_id) REFERENCES Users(id),
    FOREIGN KEY (student_id) REFERENCES Users(id),
    UNIQUE KEY unique_interview_eval (session_id, student_id),
    INDEX idx_session (session_id),
    INDEX idx_evaluator (evaluator_id),
    INDEX idx_student (student_id),
    INDEX idx_overall_score (overall_score)
);

-- =============================================
-- PERFORMANCE INTELLIGENCE
-- =============================================

-- Student performance metrics
CREATE TABLE StudentPerformance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    metric_date DATE NOT NULL,
    
    -- Core metrics
    attendance_rate DECIMAL(5,2) DEFAULT 0.00,
    task_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    participation_score DECIMAL(5,2) DEFAULT 0.00,
    execution_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Activity metrics
    classes_attended INT DEFAULT 0,
    classes_total INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_assigned INT DEFAULT 0,
    interviews_completed INT DEFAULT 0,
    
    -- Risk indicators
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    last_activity TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_metric (student_id, metric_date),
    INDEX idx_student (student_id),
    INDEX idx_batch (batch_id),
    INDEX idx_date (metric_date),
    INDEX idx_risk_level (risk_level)
);

-- =============================================
-- NOTIFICATION SYSTEM
-- =============================================

-- Notifications
CREATE TABLE Notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipient_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('class_reminder', 'deadline', 'interview', 'feedback', 'alert', 'general') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recipient_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_recipient (recipient_id),
    INDEX idx_type (notification_type),
    INDEX idx_priority (priority),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
);

-- =============================================
-- SYSTEM LOGGING & AUDIT
-- =============================================

-- Activity logs
CREATE TABLE ActivityLogs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (timestamp)
);

-- =============================================
-- SYSTEM CONFIGURATION
-- =============================================

-- System settings
CREATE TABLE SystemSettings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES Users(id) ON DELETE SET NULL,
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
);

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample system settings
INSERT INTO SystemSettings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_name', 'Student Execution & Mentorship Platform', 'string', 'Platform name', TRUE),
('max_session_duration', '180', 'number', 'Maximum session duration in minutes', FALSE),
('attendance_threshold', '75', 'number', 'Minimum attendance percentage', TRUE),
('auto_attendance_enabled', 'true', 'boolean', 'Enable automatic attendance tracking', FALSE),
('notification_email_enabled', 'false', 'boolean', 'Enable email notifications', FALSE);

-- Insert sample admin user
INSERT INTO Users (username, email, password_hash, role, first_name, last_name) VALUES
('admin', 'admin@platform.com', '$2b$10$rQZ8ZkGQJjKJxJjKjKjKjO9X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8', 'admin', 'System', 'Administrator');

-- Insert sample coordinator
INSERT INTO Users (username, email, password_hash, role, first_name, last_name) VALUES
('coordinator1', 'coordinator1@platform.com', '$2b$10$rQZ8ZkGQJjKJxJjKjKjKjO9X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8', 'coordinator', 'John', 'Smith');

-- Insert sample faculty
INSERT INTO Users (username, email, password_hash, role, first_name, last_name) VALUES
('faculty1', 'faculty1@platform.com', '$2b$10$rQZ8ZkGQJjKJxJjKjKjKjO9X8X8X8X8X8X8X8X8X8X8X8X8X8X8', 'faculty', 'Sarah', 'Johnson');

-- Insert faculty details
INSERT INTO Faculty (user_id, employee_id, department, specialization, experience_years) VALUES
(3, 'FAC001', 'Computer Science', 'Web Development & Algorithms', 8);

-- Insert sample batch
INSERT INTO Batches (name, description, coordinator_id, start_date, end_date) VALUES
('Batch 2024-Q1', 'Full Stack Development Batch', 2, '2024-01-15', '2024-06-15');

-- Insert sample students
INSERT INTO Users (username, email, password_hash, role, first_name, last_name) VALUES
('student1', 'student1@platform.com', '$2b$10$rQZ8ZkGQJjKJxJjKjKjKjO9X8X8X8X8X8X8X8X8X8X8X8X8X8X8', 'student', 'Alice', 'Brown'),
('student2', 'student2@platform.com', '$2b$10$rQZ8ZkGQJjKJxJjKjKjKjO9X8X8X8X8X8X8X8X8X8X8X8X8X8X8', 'student', 'Bob', 'Wilson');

-- Assign students to batch
INSERT INTO StudentBatches (student_id, batch_id, enrollment_date) VALUES
(4, 1, '2024-01-15'),
(5, 1, '2024-01-15');

-- Update batch student count
UPDATE Batches SET current_students = 2 WHERE id = 1;
