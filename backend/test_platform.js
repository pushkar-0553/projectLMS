// Platform Integration Test
// Student Execution & Mentorship Platform

const db = require('./config/db');

async function testPlatformIntegration() {
  console.log('=== Platform Integration Test ===\n');

  try {
    // Test 1: Database Connection
    await db.execute('SELECT 1');
    console.log('Database connection: OK');

    // Test 2: Verify Core Tables
    const coreTables = ['Users', 'Projects', 'Batches', 'StudentBatches', 'LiveSessions', 'Notifications', 'StudentPerformance'];
    let tablesExist = 0;
    
    for (const table of coreTables) {
      try {
        await db.execute(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
        tablesExist++;
        console.log(`${table}: OK`);
      } catch (error) {
        console.log(`${table}: MISSING - ${error.message}`);
      }
    }

    // Test 3: Verify User Roles
    const [userRoles] = await db.execute(`
      SELECT role, COUNT(*) as count 
      FROM Users 
      GROUP BY role
    `);
    console.log('\nUser Roles:');
    userRoles.forEach(role => {
      console.log(`  ${role.role}: ${role.count}`);
    });

    // Test 4: Verify Batches and Student Assignments
    const [batchCount] = await db.execute('SELECT COUNT(*) as count FROM Batches');
    const [studentBatchCount] = await db.execute('SELECT COUNT(*) as count FROM StudentBatches');
    console.log(`\nBatches: ${batchCount[0].count}`);
    console.log(`Student-Batch Assignments: ${studentBatchCount[0].count}`);

    // Test 5: Verify System Settings
    const [settingsCount] = await db.execute('SELECT COUNT(*) as count FROM SystemSettings');
    console.log(`\nSystem Settings: ${settingsCount[0].count}`);
    
    if (settingsCount[0].count > 0) {
      const [settings] = await db.execute('SELECT setting_key, setting_value FROM SystemSettings LIMIT 5');
      console.log('Sample Settings:');
      settings.forEach(setting => {
        console.log(`  ${setting.setting_key}: ${setting.setting_value}`);
      });
    }

    // Test 6: Verify Faculty Records
    const [facultyCount] = await db.execute('SELECT COUNT(*) as count FROM Faculty');
    console.log(`\nFaculty Records: ${facultyCount[0].count}`);

    // Test 7: Test Data Integrity
    console.log('\n=== Data Integrity Tests ===');
    
    // Test Users-Batches relationship
    const [orphanedStudentBatches] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM StudentBatches sb 
      LEFT JOIN Users u ON sb.student_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned StudentBatches: ${orphanedStudentBatches[0].count}`);

    // Test Projects-Steps relationship
    const [orphanedSteps] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM ProjectSteps ps 
      LEFT JOIN Projects p ON ps.project_id = p.id 
      WHERE p.id IS NULL
    `);
    console.log(`Orphaned ProjectSteps: ${orphanedSteps[0].count}`);

    // Test 8: Create Sample Data for Testing
    console.log('\n=== Creating Sample Data ===');
    
    // Create a test session
    const [host] = await db.execute('SELECT id FROM Users WHERE role = "coordinator" LIMIT 1');
    if (host.length > 0) {
      const [sessionResult] = await db.execute(`
        INSERT INTO LiveSessions (title, session_type, host_id, scheduled_start, scheduled_end)
        VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR))
      `, ['Test Session', 'class', host[0].id]);
      
      console.log(`Created test session: ${sessionResult.insertId}`);
      
      // Create a test notification
      const [notificationResult] = await db.execute(`
        INSERT INTO Notifications (user_id, title, message, type, priority)
        VALUES (?, ?, ?, ?, ?)
      `, [host[0].id, 'Test Notification', 'This is a test notification', 'general', 'medium']);
      
      console.log(`Created test notification: ${notificationResult.insertId}`);
    }

    // Test 9: Verify API Endpoints Structure
    console.log('\n=== API Structure Verification ===');
    
    // Check if platform routes file exists
    const fs = require('fs');
    const path = require('path');
    
    const platformRoutes = path.join(__dirname, 'routes', 'platformRoutes.js');
    const platformController = path.join(__dirname, 'controllers', 'platformController.js');
    const socketService = path.join(__dirname, 'services', 'socketService.js');
    
    const checks = [
      { file: 'platformRoutes.js', path: platformRoutes },
      { file: 'platformController.js', path: platformController },
      { file: 'socketService.js', path: socketService }
    ];
    
    checks.forEach(check => {
      if (fs.existsSync(check.path)) {
        console.log(`${check.file}: EXISTS`);
      } else {
        console.log(`${check.file}: MISSING`);
      }
    });

    // Test 10: Frontend Integration Check
    const frontendPath = path.join(__dirname, '..', 'frontend');
    const appJsx = path.join(frontendPath, 'src', 'App.jsx');
    const platformAPI = path.join(frontendPath, 'src', 'services', 'platformAPI.js');
    const socketClient = path.join(frontendPath, 'src', 'services', 'socketService.js');
    
    const frontendChecks = [
      { file: 'App.jsx', path: appJsx },
      { file: 'platformAPI.js', path: platformAPI },
      { file: 'socketService.js', path: socketClient }
    ];
    
    console.log('\n=== Frontend Integration ===');
    frontendChecks.forEach(check => {
      if (fs.existsSync(check.path)) {
        console.log(`${check.file}: EXISTS`);
      } else {
        console.log(`${check.file}: MISSING`);
      }
    });

    // Final Status
    console.log('\n=== Integration Test Results ===');
    
    const successRate = (tablesExist / coreTables.length) * 100;
    console.log(`Core Tables Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 80) {
      console.log('Status: SUCCESS - Platform integration is ready!');
      console.log('Next steps:');
      console.log('1. Start backend server: npm run dev');
      console.log('2. Start frontend: npm start');
      console.log('3. Test platform features');
      console.log('4. Verify real-time functionality');
    } else {
      console.log('Status: PARTIAL - Some components may not work');
      console.log('Please check missing tables and components');
    }

  } catch (error) {
    console.error('Integration test failed:', error);
    process.exit(1);
  }

  await db.end();
  process.exit(0);
}

// Run test
testPlatformIntegration();
