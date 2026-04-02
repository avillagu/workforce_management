const { Pool } = require('pg');
require('dotenv').config();
const { randomUUID } = require('crypto');
const { DateTime } = require('luxon');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function check() {
  try {
    const now = DateTime.utc().toISO();
    const id = randomUUID();
    console.log('Testing insert to wfm_auth.grupos...');
    const result = await pool.query(
        'INSERT INTO wfm_auth.grupos (id, nombre, descripcion, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [id, 'Test_Group_Z', 'Test', now, now]
    );
    console.log('SUCCESS! INSERTED:', result.rows[0]);
    // Cleanup
    await pool.query('DELETE FROM wfm_auth.grupos WHERE id = $1', [id]);
  } catch (err) {
    console.error('SERVER DB ERROR:', err.message, '| CODE:', err.code);
  } finally {
    await pool.end();
  }
}

check();
