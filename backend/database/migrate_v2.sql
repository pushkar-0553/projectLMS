-- Migration v2: Add coordinator role, project types, StudentProgress, and Teams
-- This script handles existing columns/tables gracefully

USE project_learning;

SET @dbname = 'project_learning';

-- ==========================================
-- 1. Update Users table: add coordinator role
-- ==========================================
ALTER TABLE Users MODIFY COLUMN role ENUM('student', 'admin', 'coordinator') DEFAULT 'student';

-- Add mobile column if not exists
SET @tablename = 'Users';
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Users ADD COLUMN mobile VARCHAR(20)',
  'SELECT "Column mobile already exists" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'mobile');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add batch column if not exists
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Users ADD COLUMN batch VARCHAR(100)',
  'SELECT "Column batch already exists" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'batch');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 2. Update Projects table: add type column
-- ==========================================
SET @tablename = 'Projects';

SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Projects ADD COLUMN type ENUM("simple", "main") DEFAULT "main" AFTER description',
  'SELECT "Column type already exists" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'type');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 3. Create StudentProgress table
-- ==========================================
CREATE TABLE IF NOT EXISTS StudentProgress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    project_id INT NOT NULL,
    step_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    feedback TEXT,
    reviewer_id INT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES Steps(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_step_progress (user_id, step_id)
);

-- ==========================================
-- 4. Create Teams and TeamMembers tables
-- ==========================================
CREATE TABLE IF NOT EXISTS Teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS TeamMembers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_member (team_id, user_id)
);

SELECT 'Migration v2 completed successfully!' as status;
