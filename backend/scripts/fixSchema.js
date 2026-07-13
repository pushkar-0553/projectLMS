const pool = require('../config/db');

async function fixSchema() {
  const queries = [
    "ALTER TABLE Batches ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE Batches ADD COLUMN IF NOT EXISTS coordinator_id INT",
    "ALTER TABLE Batches ADD COLUMN IF NOT EXISTS start_date DATE",
    "ALTER TABLE Batches ADD COLUMN IF NOT EXISTS end_date DATE",
    "ALTER TABLE Batches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
    
    "ALTER TABLE StudentBatchMap CHANGE COLUMN IF EXISTS user_id student_id INT NOT NULL",
    "ALTER TABLE StudentBatchMap ADD COLUMN IF NOT EXISTS assigned_by INT",
    
    "ALTER TABLE AttendanceSessions MODIFY COLUMN IF EXISTS title VARCHAR(255) NULL",
    "ALTER TABLE AttendanceSessions ADD COLUMN IF NOT EXISTS topic_covered VARCHAR(500)",
    "ALTER TABLE AttendanceRecords ADD COLUMN IF NOT EXISTS marked_by INT"
  ];

  for (const q of queries) {
    try {
      console.log(`Running: ${q}`);
      await pool.execute(q);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_BAD_FIELD_ERROR' || e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log(`   >> Skip: ${e.message}`);
      } else {
        console.error(`   !! Error: ${e.message}`);
      }
    }
  }
  console.log("Schema fix completed.");
  process.exit();
}

fixSchema();
