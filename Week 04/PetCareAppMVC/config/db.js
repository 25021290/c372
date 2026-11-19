const mysql = require('mysql2');

// MySQL Connection Pool
// The pool keeps existing connection.query(sql, params, callback) usage compatible.
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'RP738964$',
  database: 'petcare',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
