const pool = require('../config/db');

async function assignFaculty() {
  const [batches] = await pool.execute("SELECT id FROM Batches LIMIT 1");
  if (batches.length > 0) {
    const batchId = batches[0].id;
    const [faculty] = await pool.execute("SELECT id FROM Users WHERE role = 'faculty' LIMIT 1");
    if (faculty.length > 0) {
      const facId = faculty[0].id;
      await pool.execute("UPDATE Batches SET faculty_id = ? WHERE id = ?", [facId, batchId]);
      console.log(`Assigned Faculty ${facId} to Batch ${batchId}`);
    } else {
      console.log('No faculty found');
    }
  } else {
    console.log('No batches found');
  }
  process.exit();
}
assignFaculty();
