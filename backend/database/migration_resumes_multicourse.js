const pool = require('../config/db');

async function migrateResumesMultiCourse() {
  console.log('--- Starting Migration: Multi-Course Resumes & Collections ---');

  // 1. Add course_id to resume_collections
  try {
    const [cols] = await pool.execute('DESCRIBE resume_collections');
    const hasCourseId = cols.some(c => c.Field === 'course_id');
    if (!hasCourseId) {
      console.log('Adding course_id column to resume_collections...');
      await pool.execute('ALTER TABLE resume_collections ADD COLUMN course_id INT NULL');
      await pool.execute('ALTER TABLE resume_collections ADD INDEX idx_rc_course (course_id)');
      console.log('✓ Added course_id and index to resume_collections');
    } else {
      console.log('resume_collections already has course_id');
    }
  } catch (err) {
    console.error('Error on resume_collections:', err.message);
  }

  // 2. Add course_id to student_resumes
  try {
    const [cols] = await pool.execute('DESCRIBE student_resumes');
    const hasCourseId = cols.some(c => c.Field === 'course_id');
    if (!hasCourseId) {
      console.log('Adding course_id column to student_resumes...');
      await pool.execute('ALTER TABLE student_resumes ADD COLUMN course_id INT NULL');
      await pool.execute('ALTER TABLE student_resumes ADD INDEX idx_sr_course (course_id)');
      console.log('✓ Added course_id and index to student_resumes');
    } else {
      console.log('student_resumes already has course_id');
    }
  } catch (err) {
    console.error('Error on student_resumes:', err.message);
  }

  // 3. Backfill course_id in student_resumes from CourseMemberships
  console.log('Backfilling course_id in student_resumes...');
  await pool.execute(`
    UPDATE student_resumes sr
    JOIN CourseMemberships cm ON sr.student_id = cm.user_id
    SET sr.course_id = cm.course_id
  `);
  await pool.execute('UPDATE student_resumes SET course_id = 1 WHERE course_id IS NULL');
  console.log('✓ Backfilled student_resumes course_id');

  // 4. Backfill course_id in resume_collections
  console.log('Backfilling course_id in resume_collections...');
  await pool.execute(`
    UPDATE resume_collections rc
    SET rc.course_id = (
      SELECT cm.course_id 
      FROM resume_collection_students rcs
      JOIN CourseMemberships cm ON rcs.student_id = cm.user_id
      WHERE rcs.collection_id = rc.id
      LIMIT 1
    )
  `);
  await pool.execute('UPDATE resume_collections SET course_id = 1 WHERE course_id IS NULL');
  console.log('✓ Backfilled resume_collections course_id');

  console.log('--- Resume Multi-Course Migration Complete ---');
  process.exit(0);
}

migrateResumesMultiCourse().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
