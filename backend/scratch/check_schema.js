const pool = require('../config/db');

async function checkSchema() {
  try {
    const [cols1] = await pool.execute('DESCRIBE InterviewEvaluations');
    console.log('InterviewEvaluations columns:', cols1.map(c => c.Field));

    const [cols2] = await pool.execute('DESCRIBE Submissions');
    console.log('Submissions columns:', cols2.map(c => c.Field));

    const [cols3] = await pool.execute('DESCRIBE StudentProgress');
    console.log('StudentProgress columns:', cols3.map(c => c.Field));

    process.exit(0);
  } catch (err) {
    console.error('Schema check error:', err);
    process.exit(1);
  }
}

checkSchema();
