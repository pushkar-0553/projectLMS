const db = require('./config/db');

async function checkTables() {
  try {
    console.log('=== Existing Table Structure ===\n');

    // Check Users table structure
    try {
      const [users] = await db.execute('DESCRIBE Users');
      console.log('Users table columns:');
      users.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    } catch (error) {
      console.log('Users table:', error.message);
    }

    // Check Projects table structure
    try {
      const [projects] = await db.execute('DESCRIBE Projects');
      console.log('\nProjects table columns:');
      projects.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    } catch (error) {
      console.log('Projects table:', error.message);
    }

    // Check Steps table structure
    try {
      const [steps] = await db.execute('DESCRIBE Steps');
      console.log('\nSteps table columns:');
      steps.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    } catch (error) {
      console.log('Steps table:', error.message);
    }

    // Check existing data
    console.log('\n=== Existing Data ===');
    
    const [userCount] = await db.execute('SELECT COUNT(*) as count FROM Users');
    console.log(`Users: ${userCount[0].count}`);

    const [projectCount] = await db.execute('SELECT COUNT(*) as count FROM Projects');
    console.log(`Projects: ${projectCount[0].count}`);

    const [stepCount] = await db.execute('SELECT COUNT(*) as count FROM Steps');
    console.log(`Steps: ${stepCount[0].count}`);

  } catch (error) {
    console.error('Error checking tables:', error);
  }

  await db.end();
}

checkTables();
