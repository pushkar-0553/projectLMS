const db = require('./config/db');

async function runMigration() {
  try {
    console.log('Adding columns...');
    try { await db.execute("ALTER TABLE Messages ADD COLUMN status VARCHAR(20) DEFAULT 'sent'"); } catch(e) { console.log(e.message); }
    try { await db.execute("ALTER TABLE Messages ADD COLUMN read_by JSON"); } catch(e) { console.log(e.message); }
    try { await db.execute("ALTER TABLE Messages ADD COLUMN reactions JSON"); } catch(e) { console.log(e.message); }
    try { await db.execute("ALTER TABLE Messages ADD COLUMN reply_to_id INT NULL"); } catch(e) { console.log(e.message); }
    try { await db.execute("ALTER TABLE Messages ADD CONSTRAINT fk_messages_reply FOREIGN KEY (reply_to_id) REFERENCES Messages(id) ON DELETE SET NULL"); } catch(e) { console.log(e.message); }
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

runMigration();
