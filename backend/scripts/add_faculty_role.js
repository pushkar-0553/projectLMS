const pool = require('../config/db');

async function addFacultyRole() {
  try {
    console.log('Fixing Users table role ENUM...');
    
    // Check current columns to be safe
    const [columns] = await pool.execute("SHOW COLUMNS FROM Users LIKE 'role'");
    console.log('Current role column:', columns[0]);

    // Update the ENUM to include faculty
    const query = "ALTER TABLE Users MODIFY COLUMN role ENUM('admin', 'coordinator', 'student', 'faculty') NOT NULL";
    console.log(`Running: ${query}`);
    await pool.execute(query);
    
    console.log('Successfully updated role ENUM to include "faculty".');
  } catch (error) {
    console.error('Error updating role ENUM:', error.message);
  } finally {
    process.exit();
  }
}

addFacultyRole();
