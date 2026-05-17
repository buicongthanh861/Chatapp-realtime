const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

async function initDatabase() {
  pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'chatuser',
    password: process.env.DB_PASSWORD || 'chat123',
    database: process.env.DB_NAME     || 'chatflow',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset:  'utf8mb4',
    timezone: '+07:00',
  });

  // Bắt buộc set charset UTF8MB4 sau khi kết nối
  pool.on('connection', (conn) => {
    conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    conn.query("SET CHARACTER SET utf8mb4");
  });

  const conn = await pool.getConnection();
  console.log('✅ Kết nối MySQL thành công!');
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'chatflow'} @ ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  conn.release();
  return pool;
}

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function run(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

function getPool() { return pool; }

module.exports = { initDatabase, query, run, getPool };
