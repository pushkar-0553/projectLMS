const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const schemaPath = path.join(__dirname, '../database/migrate_attendance.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL by semicolons, but ignore semicolons inside strings or comments
    // A simple split often works for basic schema migrations
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log(`Found ${commands.length} commands to execute.`);

    for (let i = 0; i < commands.length; i++) {
      console.log(`Executing command ${i + 1}/${commands.length}...`);
      await pool.execute(commands[i]);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
