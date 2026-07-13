const pool = require('../config/db');

async function checkSchema() {
  try {
    const [cols] = await pool.execute('DESCRIBE MockInterviews');
    console.log('MockInterviews columns:', cols.map(c => c.Field));
    process.exit(0);
  } catch (err) {
    console.error('Schema check error:', err);
    process.exit(1);
  }
}

checkSchema();
