const pool = require('../config/db');

async function runCampaignShareMigration() {
  console.log('[Migration] Starting Feedback Campaign Share Token migration...');
  const connection = await pool.getConnection();

  try {
    // Check if share_token column already exists
    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'feedback_campaigns' 
       AND COLUMN_NAME = 'share_token'`
    );

    if (cols.length === 0) {
      console.log('[Migration] Adding share_token column to feedback_campaigns...');
      await connection.query(`
        ALTER TABLE feedback_campaigns 
        ADD COLUMN share_token VARCHAR(64) NULL AFTER status;
      `);
      await connection.query(`
        CREATE UNIQUE INDEX idx_fbc_share_token ON feedback_campaigns (share_token);
      `);
      console.log('[Migration] Added share_token column successfully.');
    } else {
      console.log('[Migration] share_token column already exists in feedback_campaigns.');
    }

    console.log('[Migration] Feedback Campaign Share Token migration completed successfully!');
  } catch (err) {
    console.error('[Migration] Migration failed:', err);
    throw err;
  } finally {
    connection.release();
    process.exit(0);
  }
}

runCampaignShareMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
