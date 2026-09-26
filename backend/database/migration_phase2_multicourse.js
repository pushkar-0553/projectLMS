const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkColumnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

async function runPhase2Migration() {
  console.log('🚀 Starting Phase 2 Database Foundation Migration...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    multipleStatements: true
  });

  try {
    // 0. Pre-Migration Baseline Check
    const [[pCount]] = await connection.query('SELECT COUNT(*) as count FROM Projects');
    const [[bCount]] = await connection.query('SELECT COUNT(*) as count FROM Batches');
    const [[uCount]] = await connection.query('SELECT COUNT(*) as count FROM Users');
    console.log(`📊 Baseline Counts -> Users: ${uCount.count}, Batches: ${bCount.count}, Projects: ${pCount.count}`);

    // 1. Update Users.role to include 'super_admin'
    console.log('⏳ 1. Updating Users.role enum to include super_admin...');
    await connection.query(`
      ALTER TABLE Users 
      MODIFY COLUMN role ENUM('student', 'admin', 'coordinator', 'faculty', 'super_admin') DEFAULT 'student'
    `);
    console.log('✅ Users.role updated successfully.');

    // 2. Create Courses Table
    console.log('⏳ 2. Creating Courses table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        short_name VARCHAR(50),
        status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
        logo_url VARCHAR(500),
        thumbnail_url VARCHAR(500),
        duration VARCHAR(100),
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_courses_slug (slug),
        INDEX idx_courses_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Courses table ready.');

    // 3. Create CourseMemberships Table
    console.log('⏳ 3. Creating CourseMemberships table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS CourseMemberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        role ENUM('student', 'faculty', 'coordinator', 'admin') NOT NULL,
        batch_id INT NULL,
        status ENUM('active', 'inactive', 'completed', 'dropped') DEFAULT 'active',
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_course_role (user_id, course_id, role),
        INDEX idx_membership_user (user_id),
        INDEX idx_membership_course_role (course_id, role),
        INDEX idx_membership_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ CourseMemberships table ready.');

    // 4. Create CourseModules Table
    console.log('⏳ 4. Creating CourseModules table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS CourseModules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        module_key VARCHAR(50) NOT NULL,
        is_enabled BOOLEAN DEFAULT TRUE,
        settings JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_course_module (course_id, module_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ CourseModules table ready.');

    // 5. Add course_id columns to existing tables safely
    const tablesToScope = ['Projects', 'Batches', 'Tasks', 'Assessments', 'LiveSessions'];
    for (const table of tablesToScope) {
      const exists = await checkColumnExists(connection, table, 'course_id');
      if (!exists) {
        console.log(`⏳ Adding course_id column to ${table}...`);
        await connection.query(`ALTER TABLE ${table} ADD COLUMN course_id INT NULL AFTER id`);
        await connection.query(`CREATE INDEX idx_${table.toLowerCase()}_course_id ON ${table}(course_id)`);
        console.log(`✅ Column course_id added to ${table}.`);
      } else {
        console.log(`ℹ️ Column course_id already exists on ${table}.`);
      }
    }

    // 6. Insert Default Legacy Course (Course 1: legacy) and Target Course (Course 2: agentk)
    console.log('⏳ 6. Seeding initial courses...');
    await connection.query(`
      INSERT INTO Courses (id, name, code, slug, description, short_name, status, duration)
      VALUES 
      (1, 'Full Stack Development', 'FS-DEV', 'legacy', 'Core Full Stack Engineering & Project Learning Curriculum', 'Full Stack', 'active', '6 Months'),
      (2, 'GenAI & Agentic AI Full Stack', 'GENAI-FS', 'agentk', 'Modern Agentic AI, Autonomous Workflows, LLM Engineering, and Full Stack Architecture', 'AgentK', 'active', '6 Months')
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        code = VALUES(code),
        slug = VALUES(slug),
        description = VALUES(description),
        short_name = VALUES(short_name),
        status = VALUES(status),
        duration = VALUES(duration);
    `);
    console.log('✅ Default courses (legacy and agentk) seeded.');

    // 7. Backfill existing records to Course 1 (legacy)
    console.log('⏳ 7. Backfilling existing Batches, Projects, Tasks, Assessments, LiveSessions to Course 1...');
    await connection.query('UPDATE Batches SET course_id = 1 WHERE course_id IS NULL');
    await connection.query('UPDATE Projects SET course_id = 1 WHERE course_id IS NULL');
    await connection.query('UPDATE Tasks SET course_id = 1 WHERE course_id IS NULL');
    await connection.query('UPDATE Assessments SET course_id = 1 WHERE course_id IS NULL');
    await connection.query('UPDATE LiveSessions SET course_id = 1 WHERE course_id IS NULL');
    console.log('✅ Backfill to Course 1 completed.');

    // 8. Populate CourseMemberships for existing users
    console.log('⏳ 8. Populating CourseMemberships for all existing users...');
    const [users] = await connection.query('SELECT id, role, email FROM Users');
    
    // Fetch batch mappings
    const [batchMaps] = await connection.query('SELECT student_id, batch_id FROM StudentBatchMap');
    const studentBatchLookup = {};
    batchMaps.forEach(m => {
      studentBatchLookup[m.student_id] = m.batch_id;
    });

    for (const u of users) {
      if (u.role === 'admin') {
        // Promote primary admin to super_admin as well
        await connection.query(`UPDATE Users SET role = 'super_admin' WHERE id = ?`, [u.id]);
        console.log(`👑 User ${u.email} (ID: ${u.id}) promoted to super_admin.`);

        // Admin membership for both courses
        await connection.query(`
          INSERT INTO CourseMemberships (user_id, course_id, role, status)
          VALUES (?, 1, 'admin', 'active'), (?, 2, 'admin', 'active')
          ON DUPLICATE KEY UPDATE status = 'active'
        `, [u.id, u.id]);
      } else if (u.role === 'coordinator') {
        await connection.query(`
          INSERT INTO CourseMemberships (user_id, course_id, role, status)
          VALUES (?, 1, 'coordinator', 'active')
          ON DUPLICATE KEY UPDATE status = 'active'
        `, [u.id]);
      } else if (u.role === 'faculty') {
        await connection.query(`
          INSERT INTO CourseMemberships (user_id, course_id, role, status)
          VALUES (?, 1, 'faculty', 'active')
          ON DUPLICATE KEY UPDATE status = 'active'
        `, [u.id]);
      } else {
        // student
        const batchId = studentBatchLookup[u.id] || null;
        await connection.query(`
          INSERT INTO CourseMemberships (user_id, course_id, role, batch_id, status)
          VALUES (?, 1, 'student', ?, 'active')
          ON DUPLICATE KEY UPDATE batch_id = VALUES(batch_id), status = 'active'
        `, [u.id, batchId]);
      }
    }
    console.log('✅ CourseMemberships successfully populated.');

    // 9. Initialize default CourseModules
    console.log('⏳ 9. Initializing default CourseModules for Course 1 & 2...');
    const modules = ['projects', 'tasks', 'attendance', 'academics', 'mock_interviews', 'resumes', 'messaging'];
    for (const cId of [1, 2]) {
      for (const mKey of modules) {
        await connection.query(`
          INSERT INTO CourseModules (course_id, module_key, is_enabled)
          VALUES (?, ?, TRUE)
          ON DUPLICATE KEY UPDATE is_enabled = TRUE
        `, [cId, mKey]);
      }
    }
    console.log('✅ CourseModules initialized.');

    // 10. Post-Migration Verification & Integrity Assertion
    console.log('\n🔍 Verifying Data Integrity Post-Migration:');
    const [[postPCount]] = await connection.query('SELECT COUNT(*) as count FROM Projects');
    const [[postBCount]] = await connection.query('SELECT COUNT(*) as count FROM Batches');
    const [[postUCount]] = await connection.query('SELECT COUNT(*) as count FROM Users');
    const [[courseCount]] = await connection.query('SELECT COUNT(*) as count FROM Courses');
    const [[membershipCount]] = await connection.query('SELECT COUNT(*) as count FROM CourseMemberships');

    console.log(`✅ Users: Before=${uCount.count}, After=${postUCount.count} (Preserved)`);
    console.log(`✅ Batches: Before=${bCount.count}, After=${postBCount.count} (Preserved)`);
    console.log(`✅ Projects: Before=${pCount.count}, After=${postPCount.count} (Preserved)`);
    console.log(`✅ Active Courses Created: ${courseCount.count}`);
    console.log(`✅ Total Course Memberships: ${membershipCount.count}`);

    if (uCount.count !== postUCount.count || bCount.count !== postBCount.count || pCount.count !== postPCount.count) {
      throw new Error('Integrity Check FAILED: Record counts do not match baseline!');
    }

    console.log('\n🎉 PHASE 2 DATABASE FOUNDATION MIGRATION COMPLETED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('❌ Migration failed with error:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

runPhase2Migration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
