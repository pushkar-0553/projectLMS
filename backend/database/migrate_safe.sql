-- Migration script to add new columns for enhanced LMS features
-- This script handles existing columns gracefully

USE project_learning;

-- Projects table columns
SET @dbname = 'project_learning';
SET @tablename = 'Projects';

-- Add difficulty column if it doesn't exist
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Projects ADD COLUMN difficulty ENUM("Easy", "Medium", "Hard") DEFAULT "Medium"',
  'SELECT "Column difficulty already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'difficulty');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add estimated_time column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Projects ADD COLUMN estimated_time INT DEFAULT 60',
  'SELECT "Column estimated_time already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'estimated_time');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add order_index column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Projects ADD COLUMN order_index INT DEFAULT 0',
  'SELECT "Column order_index already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'order_index');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add prerequisites column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Projects ADD COLUMN prerequisites JSON',
  'SELECT "Column prerequisites already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'prerequisites');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Progress table columns
SET @tablename = 'Progress';

-- Add project_completed column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Progress ADD COLUMN project_completed BOOLEAN DEFAULT FALSE',
  'SELECT "Column project_completed already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'project_completed');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add completed_steps column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Progress ADD COLUMN completed_steps JSON',
  'SELECT "Column completed_steps already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'completed_steps');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add current_step column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Progress ADD COLUMN current_step INT DEFAULT 1',
  'SELECT "Column current_step already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'current_step');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add started_at column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Progress ADD COLUMN started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  'SELECT "Column started_at already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'started_at');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add completed_at column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Progress ADD COLUMN completed_at TIMESTAMP NULL',
  'SELECT "Column completed_at already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'completed_at');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Steps table columns
SET @tablename = 'Steps';

-- Add expected_output column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Steps ADD COLUMN expected_output TEXT',
  'SELECT "Column expected_output already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'expected_output');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add hints column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Steps ADD COLUMN hints TEXT',
  'SELECT "Column hints already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'hints');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_locked column
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Steps ADD COLUMN is_locked BOOLEAN DEFAULT TRUE',
  'SELECT "Column is_locked already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_locked');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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
