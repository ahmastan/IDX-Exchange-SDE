const mysql = require("mysql2/promise");

// A pool keeps a small set of open connections and hands them out per query,
// so requests don't pay the cost of a new TCP connection + MySQL handshake.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
});

module.exports = pool;
