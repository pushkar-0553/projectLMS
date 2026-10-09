const db = require('../config/db');

async function migrate() {
  try {
    console.log('Running email tracking migration...');
    
    // Add opened_at column if not exists
    try {
      await db.query(`ALTER TABLE email_jobs ADD COLUMN opened_at DATETIME NULL AFTER sent_at`);
      console.log('Successfully added opened_at column to email_jobs.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
        console.log('opened_at column already exists.');
      } else {
        console.warn('opened_at column check:', err.message);
      }
    }

    // Modify status ENUM to include DELIVERED and OPENED
    try {
      await db.query(`
        ALTER TABLE email_jobs 
        MODIFY COLUMN status ENUM('QUEUED','PROCESSING','SENT','DELIVERED','OPENED','FAILED','RETRY_PENDING','CANCELLED') 
        DEFAULT 'QUEUED'
      `);
      console.log('Successfully updated status ENUM in email_jobs.');
    } catch (err) {
      console.warn('status enum update:', err.message);
    }

    console.log('Migration completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
