const pool = require('../config/db');

async function migrateTrainingSystem() {
  const queries = [
    // 1. Faculty Notes Table
    `CREATE TABLE IF NOT EXISTS FacultyNotes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        faculty_id INT NOT NULL,
        batch_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        reference_links JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE CASCADE
    )`,

    // 2. Tasks Table (Templates)
    `CREATE TABLE IF NOT EXISTS Tasks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES Users(id)
    )`,

    // 3. Task Assignments
    `CREATE TABLE IF NOT EXISTS TaskAssignments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_id INT NOT NULL,
        assigned_type ENUM('batch', 'sub_batch', 'student') NOT NULL,
        batch_id INT,
        sub_batch_id INT,
        student_id INT,
        deadline DATETIME,
        assigned_by INT NOT NULL,
        custom_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES Users(id)
    )`,

    // 4. Submissions with Versioning
    `CREATE TABLE IF NOT EXISTS Submissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_assignment_id INT NOT NULL,
        student_id INT NOT NULL,
        version INT DEFAULT 1,
        content TEXT,
        file_path VARCHAR(255),
        status ENUM('pending', 'submitted', 'approved', 'rejected') DEFAULT 'submitted',
        feedback TEXT,
        reviewed_by INT,
        reviewed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_assignment_id) REFERENCES TaskAssignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES Users(id)
    )`,

    // 5. Enhance Batches table to associate Faculty & Coordinator
    `ALTER TABLE Batches ADD COLUMN IF NOT EXISTS faculty_id INT`,
    `ALTER TABLE Batches ADD COLUMN IF NOT EXISTS coordinator_id INT`,
    `ALTER TABLE Batches ADD FOREIGN KEY IF NOT EXISTS (faculty_id) REFERENCES Users(id) ON DELETE SET NULL`,
    `ALTER TABLE Batches ADD FOREIGN KEY IF NOT EXISTS (coordinator_id) REFERENCES Users(id) ON DELETE SET NULL`
  ];

  console.log('--- STARTING TRAINING SYSTEM MIGRATION ---');
  
  for (const q of queries) {
    try {
      console.log(`Executing: ${q.substring(0, 50)}...`);
      await pool.execute(q);
    } catch (err) {
      if (err.code === 'ER_BAD_TABLE_ERROR' || err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log(`   >> Notice: ${err.message}`);
      } else if (err.code === 'ER_CANNOT_ADD_FOREIGN_BASE_COL') {
        // Skip secondary foreign key errors if they already exist
      } else {
        console.error(`   !! Error: ${err.message}`);
      }
    }
  }

  console.log('--- MIGRATION COMPLETED ---');
  process.exit();
}

migrateTrainingSystem();
