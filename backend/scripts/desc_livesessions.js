const pool = require('../config/db');

async function debug() {
  const [cols] = await pool.execute("DESCRIBE LiveSessions");
  cols.forEach(c => console.log(`${c.Field}: ${c.Type}`));
  process.exit();
}
debug();
