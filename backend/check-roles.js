const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function check() {
  try {
    const res = await pool.query('SELECT username, role FROM wfm_auth.usuarios');
    console.log(JSON.stringify(res.rows, null, 2));
    await pool.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
