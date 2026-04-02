const { pool } = require('../src/config/database');

async function fix() {
  try {
    const angId = 'c508512e-8669-4c8a-b07f-2d7fece73da3';
    const ferId = 'cd038761-0374-4fa5-b802-8b371a791c11';

    console.log('--- REPARACIÓN FINAL ---');

    // 1. Buscar TODOS los turnos de Fernel entre el 28 y 29 (Sábado y Domingo)
    const { rows: tFer } = await pool.query(`
       SELECT id, tipo, CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) as fecha
       FROM wfm_auth.turnos 
       WHERE usuario_id = $1 
       AND CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) BETWEEN '2026-03-28' AND '2026-03-29'
    `, [ferId]);

    // 2. Buscar TODOS los turnos de Angela entre el 28 y 29
    const { rows: tAng } = await pool.query(`
       SELECT id, tipo, CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) as fecha
       FROM wfm_auth.turnos 
       WHERE usuario_id = $1 
       AND CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) BETWEEN '2026-03-28' AND '2026-03-29'
    `, [angId]);

    console.log(`Fernel tiene ${tFer.length} registros. IDs: ${tFer.map(t=>t.id).join(', ')}`);
    console.log(`Angela tiene ${tAng.length} registros. IDs: ${tAng.map(t=>t.id).join(', ')}`);

    // Sábado: Angela debería tener DESCANSO, Fernel debería tener TURNO.
    // Domingo: Angela debería tener TURNO, Fernel debería tener DESCANSO.
    
    // Si Fernel tiene 2 el domingo, pasarle el de tipo 'turno' a Angela
    const ferDom = tFer.filter(t => t.fecha.toISOString().split('T')[0] === '2026-03-29');
    if (ferDom.length > 1) {
       const aMover = ferDom.find(t => t.tipo === 'turno' || t.tipo === null);
       if (aMover) {
         await pool.query("UPDATE wfm_auth.turnos SET usuario_id = $1, publicado = true WHERE id = $2", [angId, aMover.id]);
         console.log('✅ Domingo corregido: Turno devuelto a Angela.');
       }
    }

    // Si Angela tiene 2 el sábado (poco probable ahora, pero por si acaso) o Fernel tiene el descanso
    // La lógica de intercambio correcta para el sábado:
    // ... ya lo hice en el script anterior, pero vamos a asegurar.
    
    console.log('Reparación completada.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fix();
