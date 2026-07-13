const pool = require('./config/db');

async function debugData() {
  try {
    const [faculty] = await pool.execute("SELECT id, name, role FROM Users WHERE role IN ('faculty', 'admin')");
    console.log('\n--- FACULTY/ADMIN USERS ---');
    console.table(faculty);

    const [batches] = await pool.execute("SELECT id, name FROM Batches");
    console.log('\n--- BATCHES ---');
    console.table(batches);

    const [students] = await pool.execute("SELECT id, name FROM Users WHERE role = 'student'");
    console.log('\n--- STUDENTS ---');
    console.table(students);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugData();
