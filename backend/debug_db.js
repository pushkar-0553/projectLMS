const pool = require('./config/db');

async function checkData() {
  try {
    const [users] = await pool.execute('SELECT id, name, email, role FROM Users');
    console.log('\n--- USERS ---');
    console.table(users);

    const [batches] = await pool.execute('SELECT id, name, coordinator_id FROM Batches');
    console.log('\n--- BATCHES ---');
    console.table(batches);

    const [subBatches] = await pool.execute('SELECT id, name, batch_id FROM SubBatches');
    console.log('\n--- SUB-BATCHES ---');
    console.table(subBatches);

    const [facultyAssignments] = await pool.execute('SELECT * FROM FacultyBatchMap');
    console.log('\n--- FACULTY BATCH ASSIGNMENTS (FacultyBatchMap) ---');
    console.table(facultyAssignments);

    const [studentAssignments] = await pool.execute('SELECT * FROM StudentBatchMap');
    console.log('\n--- STUDENT BATCH ASSIGNMENTS (StudentBatchMap) ---');
    console.table(studentAssignments);

    const [attendance] = await pool.execute('SELECT id, student_id, recorded_at, status FROM AttendanceRecords LIMIT 10');
    console.log('\n--- ATTENDANCE RECORDS (Sample) ---');
    console.table(attendance);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
