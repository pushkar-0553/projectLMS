const pool = require('../config/db');

async function checkFaculties() {
  const [facs] = await pool.execute("SELECT * FROM Users WHERE role = 'faculty'");
  console.log('Faculty count:', facs.length);
  console.table(facs.map(f => ({ id: f.id, name: f.name, email: f.email })));
  process.exit();
}
checkFaculties();
