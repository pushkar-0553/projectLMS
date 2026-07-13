const pool = require('../config/db');

async function runMigration() {
    try {
        console.log('Running migration: Add is_read to Messages...');
        // Check if column exists first
        const [columns] = await pool.execute("SHOW COLUMNS FROM Messages LIKE 'is_read'");
        if (columns.length === 0) {
            await pool.execute('ALTER TABLE Messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE');
            await pool.execute('CREATE INDEX idx_messages_unread ON Messages (receiver_id, is_read)');
            console.log('Migration successful: Column is_read added.');
        } else {
            console.log('Migration skipped: Column is_read already exists.');
        }
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
