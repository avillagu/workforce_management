const { pool } = require('../src/config/database');

async function check() {
  try {
    const res = await pool.query(`
      SELECT s.*, 
             u1.username as sol_user, 
             u2.username as obj_user,
             t1.usuario_id as t1_owner,
             t2.usuario_id as t2_owner
      FROM wfm_auth.solicitudes_cambio s
      JOIN wfm_auth.usuarios u1 ON s.solicitante_id = u1.id
      JOIN wfm_auth.usuarios u2 ON s.objetivo_id = u2.id
      LEFT JOIN wfm_auth.turnos t1 ON s.turno_solicitante_id = t1.id
      LEFT JOIN wfm_auth.turnos t2 ON s.turno_objetivo_id = t2.id
      ORDER BY s.created_at DESC LIMIT 1
    `);
    
    if (res.rows.length === 0) {
      console.log('No se encontraron solicitudes.');
      return;
    }

    const s = res.rows[0];
    console.log('--- REVISIÓN DE ÚLTIMA SOLICITUD ---');
    console.log(`ID: ${s.id}`);
    console.log(`Fecha: ${s.fecha}`);
    console.log(`Estado Final: ${s.estado_final}`);
    console.log(`Solicitante: ${s.sol_user} (ID: ${s.solicitante_id}) - Turno ID: ${s.turno_solicitante_id}`);
    console.log(`Objetivo: ${s.obj_user} (ID: ${s.objetivo_id}) - Turno ID: ${s.turno_objetivo_id}`);
    console.log(`Dueño actual de Turno 1: ${s.t1_owner}`);
    console.log(`Dueño actual de Turno 2: ${s.t2_owner}`);
    
    if (s.estado_final === 'aprobada') {
       if (s.t1_owner === s.objetivo_id) {
         console.log('✅ El turno 1 se movió correctamente al objetivo.');
       } else {
         console.log('❌ El turno 1 SIGUE con el dueño antiguo o alguien más.');
       }
       
       if (s.turno_objetivo_id) {
         if (s.t2_owner === s.solicitante_id) {
           console.log('✅ El turno 2 se movió correctamente al solicitante.');
         } else {
           console.log('❌ El turno 2 SIGUE con el dueño antiguo o alguien más.');
         }
       } else {
         console.log('ℹ️ El objetivo no tenía turno (descanso), nada que intercambiar de vuelta.');
       }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
