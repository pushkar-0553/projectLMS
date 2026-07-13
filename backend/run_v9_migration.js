const pool = require('./config/db');

async function runMigration() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS FacultyBatchMap (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      faculty_id  INT NOT NULL,
      batch_id    INT NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (faculty_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id)   REFERENCES Batches(id) ON DELETE CASCADE,
      UNIQUE KEY (faculty_id, batch_id)
    )`,
    `CREATE TABLE IF NOT EXISTS FacultyNotes (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      faculty_id      INT NOT NULL,
      batch_id        INT NOT NULL,
      title           VARCHAR(255) NOT NULL,
      content         TEXT NOT NULL,
      reference_links JSON,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (faculty_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id)   REFERENCES Batches(id) ON DELETE CASCADE,
      INDEX idx_notes_batch (batch_id)
    )`
  ];

  for (const q of queries) {
    try {
      console.log(`Running: ${q.substring(0, 50)}...`);
      await pool.execute(q);
      console.log("Success.");
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
  process.exit(0);
}

runMigration();
