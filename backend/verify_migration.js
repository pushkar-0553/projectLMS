// Migration Verification Script
// Student Execution & Mentorship Platform

const db = require('./config/db');

async function verifyMigration() {
  console.log('=== Platform Migration Verification ===\n');

  try {
    // Test database connection
    await db.execute('SELECT 1');
    console.log('Database connection: OK');

    // Check if new tables exist
    const tablesToCheck = [
      'Users',
      'Projects', 
      'ProjectSteps',
      'StudentProjects',
      'StepProgress',
      'Batches',
      'StudentBatches',
      'LiveSessions',
      'SessionParticipants',
      'InterviewEvaluations',
      'StudentPerformance',
      'Notifications',
      'ActivityLogs',
      'SystemSettings',
      'Faculty'
    ];

    console.log('\n=== Table Verification ===');
    for (const table of tablesToCheck) {
      try {
        const [result] = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: OK (${result[0].count} records)`);
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log(`${table}: MISSING - Table does not exist`);
        } else {
          console.log(`${table}: ERROR - ${error.message}`);
        }
      }
    }

    // Check new columns in existing tables
    console.log('\n=== Column Verification ===');
    
    // Users table new columns
    const userColumns = ['phone', 'profile_image', 'is_active', 'last_login'];
    for (const column of userColumns) {
      try {
        await db.execute(`SELECT ${column} FROM Users LIMIT 1`);
        console.log(`Users.${column}: OK`);
      } catch (error) {
        console.log(`Users.${column}: MISSING`);
      }
    }

    // Projects table new columns
    const projectColumns = ['category', 'difficulty_level', 'estimated_hours', 'tags', 'is_active', 'created_by'];
    for (const column of projectColumns) {
      try {
        await db.execute(`SELECT ${column} FROM Projects LIMIT 1`);
        console.log(`Projects.${column}: OK`);
      } catch (error) {
        console.log(`Projects.${column}: MISSING`);
      }
    }

    // Check data integrity
    console.log('\n=== Data Integrity Check ===');

    // Check for orphaned records
    const orphanedProjects = await db.execute(`
      SELECT COUNT(*) as count 
      FROM Projects p 
      LEFT JOIN Users u ON p.created_by = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned Projects: ${orphanedProjects[0][0].count}`);

    const orphanedStudentBatches = await db.execute(`
      SELECT COUNT(*) as count 
      FROM StudentBatches sb 
      LEFT JOIN Users u ON sb.student_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned StudentBatches (Student): ${orphanedStudentBatches[0][0].count}`);

    const orphanedBatches = await db.execute(`
      SELECT COUNT(*) as count 
      FROM StudentBatches sb 
      LEFT JOIN Batches b ON sb.batch_id = b.id 
      WHERE b.id IS NULL
    `);
    console.log(`Orphaned StudentBatches (Batch): ${orphanedBatches[0][0].count}`);

    // Check system settings
    try {
      const [settings] = await db.execute('SELECT COUNT(*) as count FROM SystemSettings');
      console.log(`System Settings: ${settings[0].count} records`);
    } catch (error) {
      console.log('System Settings: Table missing');
    }

    // Summary statistics
    console.log('\n=== Summary Statistics ===');
    
    const [userStats] = await db.execute(`
      SELECT role, COUNT(*) as count 
      FROM Users 
      GROUP BY role
    `);
    console.log('Users by role:');
    userStats.forEach(stat => {
      console.log(`  ${stat.role}: ${stat.count}`);
    });

    try {
      const [batchStats] = await db.execute('SELECT COUNT(*) as count FROM Batches');
      console.log(`Total Batches: ${batchStats[0].count}`);

      const [sessionStats] = await db.execute('SELECT COUNT(*) as count FROM LiveSessions');
      console.log(`Total Sessions: ${sessionStats[0].count}`);

      const [notificationStats] = await db.execute('SELECT COUNT(*) as count FROM Notifications');
      console.log(`Total Notifications: ${notificationStats[0].count}`);
    } catch (error) {
      console.log('Some statistics unavailable (tables may be missing)');
    }

    console.log('\n=== Migration Status ===');
    
    // Check if core platform tables exist
    const coreTables = ['Batches', 'LiveSessions', 'Notifications', 'StudentPerformance'];
    let coreTablesExist = 0;
    
    for (const table of coreTables) {
      try {
        await db.execute(`SELECT 1 FROM ${table} LIMIT 1`);
        coreTablesExist++;
      } catch (error) {
        // Table doesn't exist
      }
    }

    if (coreTablesExist === coreTables.length) {
      console.log('Status: SUCCESS - All core platform tables are present');
      console.log('Platform migration completed successfully! Ready for testing.');
    } else if (coreTablesExist > 0) {
      console.log(`Status: PARTIAL - ${coreTablesExist}/${coreTables.length} core tables present`);
      console.log('Some platform features may not be available.');
    } else {
      console.log('Status: NOT MIGRATED - Core platform tables are missing');
      console.log('Please run the migration script first.');
    }

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }

  await db.end();
  process.exit(0);
}

// Run verification
verifyMigration();
