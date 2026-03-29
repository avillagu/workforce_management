const { pool } = require('../src/config/database');

async function fix() {
  try {
    console.log('Buscando solicitudes estancadas...');
    const res = await pool.query(`
      UPDATE wfm_auth.solicitudes_cambio 
      SET estado_admin = 'pendiente' 
      WHERE estado_final = 'abierta' 
      AND estado_admin = 'aprobado' 
      AND estado_objetivo = 'aprobado' 
      RETURNING id
    `);
    console.log(`Se reiniciaron ${res.rowCount} solicitudes.`);
  } catch (err) {
    console.error('Error al fijar solicitudes:', err);
  } finally {
    process.exit(0);
  }
}

fix();
