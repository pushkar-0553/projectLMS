const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true }
  });

  const hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // admin123
  
  try {
    await connection.execute(`
      INSERT INTO Users (name, email, password, role) VALUES 
      ('Test Coordinator', 'coord@lms.com', ?, 'coordinator'),
      ('Test Student', 'student@lms.com', ?, 'student')
      ON DUPLICATE KEY UPDATE role=VALUES(role), password=VALUES(password)
    `, [hash, hash]);
    console.log("Users created successfully");
  } catch (error) {
    console.error("Error creating users:", error);
  } finally {
    await connection.end();
  }
}
main();
