const pool = require('./config/db');

async function runMigration() {
  console.log('Starting Cloudinary Resume Storage migration (V3)...');

  try {
    // Check current columns on student_resumes table
    const [columns] = await pool.query('SHOW COLUMNS FROM student_resumes');
    const existingCols = columns.map(c => c.Field.toLowerCase());

    console.log('Existing columns on student_resumes:', existingCols);

    // 1. Add Cloudinary columns if they do not exist
    if (!existingCols.includes('cloudinary_public_id')) {
      console.log("Adding column 'cloudinary_public_id'...");
      await pool.query('ALTER TABLE student_resumes ADD COLUMN cloudinary_public_id VARCHAR(255) DEFAULT NULL');
    }
    
    if (!existingCols.includes('cloudinary_url')) {
      console.log("Adding column 'cloudinary_url'...");
      await pool.query('ALTER TABLE student_resumes ADD COLUMN cloudinary_url VARCHAR(500) DEFAULT NULL');
    }

    if (!existingCols.includes('file_name')) {
      console.log("Adding column 'file_name'...");
      await pool.query('ALTER TABLE student_resumes ADD COLUMN file_name VARCHAR(255) DEFAULT NULL');
      
      // Seed existing file_name from resume_file_name if possible
      if (existingCols.includes('resume_file_name')) {
        console.log("Seeding file_name from resume_file_name...");
        await pool.query('UPDATE student_resumes SET file_name = resume_file_name WHERE file_name IS NULL');
      }
    }

    // 2. Drop old Google Drive columns if they exist
    if (existingCols.includes('google_drive_file_id')) {
      console.log("Dropping column 'google_drive_file_id'...");
      await pool.query('ALTER TABLE student_resumes DROP COLUMN google_drive_file_id');
    }

    if (existingCols.includes('google_drive_url')) {
      console.log("Dropping column 'google_drive_url'...");
      await pool.query('ALTER TABLE student_resumes DROP COLUMN google_drive_url');
    }

    console.log('Database migration V3 successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('Database migration V3 failed:', error);
    process.exit(1);
  }
}

runMigration();
