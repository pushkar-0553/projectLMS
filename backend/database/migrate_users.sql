-- Migration to add mobile and batch columns to Users table
USE project_learning;

-- Add mobile column if not exists
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Users ADD COLUMN mobile VARCHAR(20)',
  'SELECT "Column mobile already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'project_learning' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'mobile');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add batch column if not exists
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Users ADD COLUMN batch VARCHAR(50)',
  'SELECT "Column batch already exists - skipping" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'project_learning' AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'batch');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'User columns migration completed successfully!' as status;
