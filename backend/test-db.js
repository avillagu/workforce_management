const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wfm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

console.log('Probando configuración:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password ? '****' : '(vacío)'
});

const pool = new Pool(dbConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error fatal de conexión:', err.message);
    process.exit(1);
  }
  console.log('✅ Conexión exitosa');
  release();
  pool.end();
  process.exit(0);
});
