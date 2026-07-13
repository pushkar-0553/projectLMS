const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
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

  const [rows] = await connection.execute('DESCRIBE Messages');
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}

checkSchema().catch(console.error);
