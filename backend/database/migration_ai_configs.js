const db = require('../config/db');

async function runMigration() {
  console.log('Running migration for exam_ai_configs...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS exam_ai_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      display_name VARCHAR(150) NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'openai',
      model_name VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
      base_url VARCHAR(255) NULL,
      encrypted_api_key TEXT NOT NULL,
      iv VARCHAR(64) NOT NULL,
      auth_tag VARCHAR(64) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      is_healthy TINYINT(1) NOT NULL DEFAULT 1,
      last_tested_at DATETIME NULL,
      last_error_message TEXT NULL,
      created_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active (is_active),
      INDEX idx_default (is_default)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('exam_ai_configs table created or verified successfully!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
