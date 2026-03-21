-- Migration script to add new columns for enhanced LMS features
-- Run this to update existing database schema

USE project_learning;

-- Add new columns to Projects table (MySQL 8.0+)
ALTER TABLE Projects 
ADD COLUMN difficulty ENUM('Easy', 'Medium', 'Hard') DEFAULT 'Medium',
ADD COLUMN estimated_time INT DEFAULT 60,
ADD COLUMN order_index INT DEFAULT 0,
ADD COLUMN prerequisites JSON;

-- Add new columns to Progress table
ALTER TABLE Progress 
ADD COLUMN project_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN completed_steps JSON,
ADD COLUMN current_step INT DEFAULT 1,
ADD COLUMN started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN completed_at TIMESTAMP NULL,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add new columns to Steps table
ALTER TABLE Steps 
ADD COLUMN expected_output TEXT,
ADD COLUMN hints TEXT,
ADD COLUMN is_locked BOOLEAN DEFAULT TRUE;

-- Create StepProgress table if it doesn't exist
CREATE TABLE IF NOT EXISTS StepProgress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    step_id INT NOT NULL,
    project_id INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completion_time TIMESTAMP NULL,
    attempts INT DEFAULT 0,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES Steps(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_step (user_id, step_id)
);

SELECT 'Database migration completed successfully!' as status;
