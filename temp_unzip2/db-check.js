const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function check() {
  try {
    const res = await pool.query('SELECT * FROM wfm_auth.usuarios');
    console.log('Usuarios found:', res.rows.length);
    console.log('Columns:', Object.keys(res.rows[0] || {}));
    res.rows.forEach(r => {
      console.log(`User: ${r.username}, Role: ${r.role}, FullName: ${r.full_name}, PW Hash: ${r.password_hash.substring(0, 10)}...`);
    });
  } catch (err) {
    console.error('Error querying:', err.message);
  } finally {
    await pool.end();
  }
}

check();
