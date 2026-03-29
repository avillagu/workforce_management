const { pool } = require('../config/database');

/**
 * Obtiene estadísticas generales para el dashboard
 */
const getStats = async () => {
  // 1. Total empleados (excluyendo admin si se desea, o todos los operativos)
  const empleadosQuery = "SELECT COUNT(*) FROM wfm_auth.usuarios WHERE role = 'empleado'";
  
  // 2. Empleados activos (con sesión de asistencia abierta en estados productivos de las últimas 24h)
  const activosQuery = `
    SELECT COUNT(DISTINCT usuario_id) 
    FROM wfm_auth.asistencias 
    WHERE hora_fin IS NULL 
    AND estado IN ('disponible', 'descanso', 'en_bano')
    AND hora_inicio > (NOW() - INTERVAL '24 hours')
  `;
  
  // 3. Novedades/Solicitudes pendientes
  const novedadesQuery = "SELECT COUNT(*) FROM wfm_auth.solicitudes_cambio WHERE estado_final = 'abierta'";

  // Ejecutar todas en paralelo para mayor eficiencia
  const [resEmp, resAct, resNov] = await Promise.all([
    pool.query(empleadosQuery),
    pool.query(activosQuery),
    pool.query(novedadesQuery)
  ]);

  return {
    total_empleados: parseInt(resEmp.rows[0].count, 10),
    empleados_activos: parseInt(resAct.rows[0].count, 10),
    novedades_pendientes: parseInt(resNov.rows[0].count, 10)
  };
};

module.exports = {
  getStats
};
