const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false
    }
  });

  console.log('Adding columns...');
  await connection.execute(`
    ALTER TABLE Messages 
    ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
    ADD COLUMN attachments JSON DEFAULT NULL,
    ADD COLUMN pinned_by INT DEFAULT NULL
  `);

  console.log('Adding constraint...');
  await connection.execute(`
    ALTER TABLE Messages
    ADD CONSTRAINT fk_pinned_by FOREIGN KEY (pinned_by) REFERENCES Users(id)
  `);

  console.log('Migration completed successfully.');
  await connection.end();
}

migrate().catch(console.error);
