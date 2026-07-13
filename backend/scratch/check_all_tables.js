const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAllTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true
    },
    multipleStatements: true
  });

  try {
    const [rows] = await connection.query('SHOW TABLES');
    console.log('=== All Tables ===');
    rows.forEach(row => {
      console.log(Object.values(row)[0]);
    });

    const [notifTable] = await connection.query("SHOW TABLES LIKE 'Notifications'");
    if (notifTable.length > 0) {
      const [columns] = await connection.query('DESCRIBE Notifications');
      console.log('\n=== Notifications Columns ===');
      columns.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    } else {
      console.log('\n❌ Notifications table missing!');
    }

    const [msgTable] = await connection.query("SHOW TABLES LIKE 'Messages'");
    if (msgTable.length > 0) {
      const [columns] = await connection.query('DESCRIBE Messages');
      console.log('\n=== Messages Columns ===');
      columns.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    } else {
      console.log('\n❌ Messages table missing!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkAllTables();
