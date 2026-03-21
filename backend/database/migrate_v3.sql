-- Migration v3: Add images column to Steps table
USE project_learning;

SET @dbname = 'project_learning';
SET @tablename = 'Steps';

-- Add images column (JSON array of image paths) if not exists
SET @sql = (SELECT IF(
  COUNT(*) = 0,
  'ALTER TABLE Steps ADD COLUMN images JSON DEFAULT NULL AFTER hints',
  'SELECT "Column images already exists" as message'
)
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'images');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration v3 completed successfully!' as status;
