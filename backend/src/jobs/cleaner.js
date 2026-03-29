const { pool } = require('../config/database');

/**
 * Job para limpiar notificaciones antiguas
 */
const runNotificationCleaner = async () => {
  try {
    console.log('--- EJECUTANDO LIMPIEZA DE NOTIFICACIONES ---');
    
    // 1. Borrar notificaciones de más de 60 días
    const { rowCount: notifsDeleted } = await pool.query(`
      DELETE FROM wfm_auth.notificaciones 
      WHERE created_at < NOW() - INTERVAL '60 days';
    `);

    // 2. Borrar solicitudes de cambio de más de 60 días
    const { rowCount: solicitudesDeleted } = await pool.query(`
      DELETE FROM wfm_auth.solicitudes_cambio
      WHERE created_at < NOW() - INTERVAL '60 days';
    `);

    console.log(`✅ Se eliminaron ${notifsDeleted} notificaciones y ${solicitudesDeleted} solicitudes antiguas.`);
  } catch (err) {
    console.error('❌ Error en el cleaner de notificaciones:', err);
  }
};

/**
 * Inicializar proceso periódico (ejecutar cada 24 horas)
 */
const initCleaner = () => {
  // Ejecutar una vez al arrancar
  runNotificationCleaner();
  
  // Programar para cada 24 horas (en milisegundos)
  const interval = 24 * 60 * 60 * 1000;
  setInterval(runNotificationCleaner, interval);
  
  console.log('🔄 Job de limpieza programado para ejecutarse cada 24 horas.');
};

module.exports = { initCleaner };
