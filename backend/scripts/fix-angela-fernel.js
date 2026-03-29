const { pool } = require('../src/config/database');

async function fix() {
  try {
    const angelaId = 'c508512e-8669-4c8a-b07f-2d7fece73da3';
    const fernelId = 'cd038761-0374-4fa5-b802-8b371a791c11';
    const sab = '2026-03-28';
    const dom = '2026-03-29';

    console.log('Limpiando desajuste de Sábado y Domingo...');

    // 1. Devolver a Angela su sábado (o dárselo a Fernel as it was supposed?)
    // El usuario quería cambiar Sábado. Angela tenía turno, Fernel descanso.
    // Resultado deseado: Fernel tiene el turno del sábado, Angela tiene descanso el sábado.
    
    // Buscar los turnos actuales de esos días
    const { rows: tSab } = await pool.query("SELECT * FROM wfm_auth.turnos WHERE CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) = $1 AND usuario_id IN ($2, $3)", [sab, angelaId, fernelId]);
    const { rows: tDom } = await pool.query("SELECT * FROM wfm_auth.turnos WHERE CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) = $1 AND usuario_id IN ($2, $3)", [dom, angelaId, fernelId]);

    console.log('Turnos encontrados Sábado:', tSab.length);
    console.log('Turnos encontrados Domingo:', tDom.length);

    // Si el domingo se cambió mal (Fernel tiene 2), devolvérselo a Angela
    // En la imagen, Fernel tiene DESCANSO y 12:40-20:00 el DOMINGO.
    // Angela NO tiene nada el domingo.
    // Supongo que el 12:40-20:00 era de Angela originalmente?
    // Angela.lun = 14:40, Angela.sab = 06:00.
    // En la imagen original (si es que la vi antes), o por patrón, tal vez.
    
    // Vamos a buscar todos los turnos del domingo para esos dos
    const fernelDom = tDom.filter(t => t.usuario_id === fernelId);
    if (fernelDom.length > 1) {
       // El turno que NO es descanso devolverlo a Angela
       const tReal = fernelDom.find(t => t.tipo === 'turno' || t.tipo === null);
       if (tReal) {
         await pool.query("UPDATE wfm_auth.turnos SET usuario_id = $1 WHERE id = $2", [angelaId, tReal.id]);
         console.log('✅ Corregido Domingo: El turno real vuelve a Angela.');
       }
    }

    // Ahora Sábado: Querían cambiarlo.
    // Angela (solicitante) -> Fernel
    // Fernel (objetivo) -> Angela
    const angelaSab = tSab.find(t => t.usuario_id === angelaId && t.tipo === 'turno');
    const fernelSab = tSab.find(t => t.usuario_id === fernelId && t.tipo === 'descanso');

    if (angelaSab) {
       await pool.query("UPDATE wfm_auth.turnos SET usuario_id = $1, publicado = true WHERE id = $2", [fernelId, angelaSab.id]);
       console.log('✅ Corregido Sábado: El turno de Angela pasa a Fernel.');
    }
    if (fernelSab) {
       await pool.query("UPDATE wfm_auth.turnos SET usuario_id = $1, publicado = true WHERE id = $2", [angelaId, fernelSab.id]);
       console.log('✅ Corregido Sábado: El descanso de Fernel pasa a Angela.');
    }

    console.log('Proceso de reparación manual terminado.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fix();
