const { pool } = require('../config/database');
const { DateTime } = require('luxon');
const turnosService = require('./turnosService');
const ColombiaHolidays = require('../utils/colombiaHolidays');

/**
 * Obtiene todas las configuraciones inteligentes
 */
const getConfiguraciones = async () => {
  const query = `
    SELECT c.*, g.nombre as grupo_nombre 
    FROM wfm_auth.configuraciones_inteligentes c
    LEFT JOIN wfm_auth.grupos g ON c.grupo_id = g.id
    ORDER BY c.created_at DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

/**
 * Crea una configuración inteligente
 */
const crearConfiguracion = async (data) => {
  const { nombre, grupo_id, configuracion, creado_por } = data;
  const query = `
    INSERT INTO wfm_auth.configuraciones_inteligentes (nombre, grupo_id, configuracion, creado_por)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [nombre, grupo_id, JSON.stringify(configuracion), creado_por]);
  return rows[0];
};

/**
 * Actualiza una configuración inteligente
 */
const actualizarConfiguracion = async (id, data) => {
  const { nombre, grupo_id, configuracion } = data;
  const query = `
    UPDATE wfm_auth.configuraciones_inteligentes
    SET nombre = COALESCE($2, nombre),
        grupo_id = COALESCE($3, grupo_id),
        configuracion = COALESCE($4, configuracion),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [id, nombre, grupo_id, JSON.stringify(configuracion)]);
  return rows[0];
};

/**
 * Elimina una configuración inteligente
 */
const eliminarConfiguracion = async (id) => {
  const query = 'DELETE FROM wfm_auth.configuraciones_inteligentes WHERE id = $1 RETURNING *;';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

/**
 * Genera la programación basada en una configuración inteligente
 */
const generarProgramacion = async (configData, fechaInicioStr) => {
  const { configuracion } = configData;
  const { 
    empleado_ids, turnos, cobertura_sabado, cobertura_domingo, 
    cobertura_festivo, tipo_rotacion, periodo,
    horas_max_semana = 44 
  } = configuracion;

  // 0. Pre-calcular duración de turnos para balanceo
  const turnoHours = turnos.map(t => {
    const [hI, mI] = t.inicio.split(':').map(Number);
    const [hF, mF] = t.fin.split(':').map(Number);
    let d = hF + (mF/60) - (hI + (mI/60));
    if (d <= 0) d += 24;
    return d;
  });

  const horasSemanales = new Map();
  const horasTotales = new Map();
  empleado_ids.forEach(id => { horasSemanales.set(id, 0); horasTotales.set(id, 0); });

  let fechaInicio = DateTime.fromISO(fechaInicioStr, { zone: 'utc' }).startOf('day');
  let numDias = 7;
  if (periodo === 'quincena') numDias = 15;
  if (periodo === 'mes') {
    numDias = Math.floor(fechaInicio.endOf('month').diff(fechaInicio, 'days').days) + 1;
  }
  
  let turnosAGenerar = [];

  const { rows: empleados } = await pool.query(
    'SELECT id, full_name FROM wfm_auth.usuarios WHERE id = ANY($1)',
    [empleado_ids]
  );

  let decisionesBloque = new Map(); // id -> 'descanso' | 'turno'
  let enBloqueEspecial = false;
  let bloquesTrabajadosSeguidos = new Map(); 
  let festivosTrabajados = new Map(); 

  empleado_ids.forEach(id => { 
    bloquesTrabajadosSeguidos.set(id, 0);
    festivosTrabajados.set(id, 0);
  });

  for (let i = 0; i < numDias; i++) {
    const fechaActual = fechaInicio.plus({ days: i });
    
    // Reset semanal cada Lunes
    if (fechaActual.weekday === 1) {
      for (const id of empleado_ids) horasSemanales.set(id, 0);
    }

    const esSabado = fechaActual.weekday === 6;
    const esDomingo = fechaActual.weekday === 7;
    const esFestivo = ColombiaHolidays.isHoliday(fechaActual);

    const diasDescansoPermitidos = configuracion.dias_descanso || [6, 7]; 
    const incluirFestivos = configuracion.incluir_festivos ?? true;
    const descansosConsecutivos = configuracion.descansos_consecutivos ?? true;
    
    const esDiaEspecial = diasDescansoPermitidos.includes(fechaActual.weekday) || (incluirFestivos && esFestivo);
    const esDiaBloqueable = esSabado || esDomingo; // Solo Sáb/Dom son bloqueables consecutivamente

    // Detección de inicio de bloque especial (SÓLO Sáb/Dom)
    if (esDiaBloqueable && !enBloqueEspecial && descansosConsecutivos) {
      enBloqueEspecial = true;
      decisionesBloque.clear();
      
      // Calcular cobertura máxima necesaria para el bloque Sáb-Dom
      let maxCoberturaBloque = 0;
      let cursor = fechaActual;
      while (cursor.weekday === 6 || cursor.weekday === 7) {
        let cob_hoy = empleado_ids.length;
        if (cursor.weekday === 6) cob_hoy = Math.min(cobertura_sabado, empleado_ids.length);
        else if (cursor.weekday === 7) cob_hoy = Math.min(cobertura_domingo, empleado_ids.length);
        
        if (cob_hoy > maxCoberturaBloque) maxCoberturaBloque = cob_hoy;
        cursor = cursor.plus({ days: 1 });
      }

      const empleadosParaDecidir = [...empleados].sort((a, b) => {
        const segA = bloquesTrabajadosSeguidos.get(a.id) || 0;
        const segB = bloquesTrabajadosSeguidos.get(b.id) || 0;
        if (segA !== segB) return segB - segA;

        const hTotA = horasTotales.get(a.id) || 0;
        const hTotB = horasTotales.get(b.id) || 0;
        return hTotB - hTotA; // El que más horas tiene va primero para DESCANSAR
      });

      const numDescansan = Math.max(0, empleado_ids.length - maxCoberturaBloque);
      empleadosParaDecidir.forEach((emp, idx) => {
        const descansa = idx < numDescansan;
        decisionesBloque.set(emp.id, descansa ? 'descanso' : 'turno');
        if (descansa) bloquesTrabajadosSeguidos.set(emp.id, 0);
        else bloquesTrabajadosSeguidos.set(emp.id, (bloquesTrabajadosSeguidos.get(emp.id) || 0) + 1);
      });
    } else if (!esDiaBloqueable) {
      enBloqueEspecial = false;
      decisionesBloque.clear();
    }

    // Ordenar empleados (solo para días no bloqueados o festivos independientes)
    const empleadosOrdenados = [...empleados].sort((a, b) => {
      // Priorizar equidad en FESTIVOS
      if (esFestivo && !esDiaBloqueable) {
        const fA = festivosTrabajados.get(a.id) || 0;
        const fB = festivosTrabajados.get(b.id) || 0;
        if (fA !== fB) return fB - fA; 
      }

      const hSemA = horasSemanales.get(a.id) || 0;
      const hSemB = horasSemanales.get(b.id) || 0;
      if (Math.abs(hSemA - hSemB) > 0.1) return hSemA - hSemB;

      const hTotA = horasTotales.get(a.id) || 0;
      const hTotB = horasTotales.get(b.id) || 0;
      return hTotA - hTotB;
    });

    for (let j = 0; j < empleadosOrdenados.length; j++) {
      const empleado = empleadosOrdenados[j];
      let t_inicio, t_fin, tipo = 'turno';

      let debeTrabajar = true;
      if (descansosConsecutivos && enBloqueEspecial && esDiaBloqueable) {
        debeTrabajar = decisionesBloque.get(empleado.id) === 'turno';
      } else if (esDiaEspecial) {
        let coberturaDia = empleado_ids.length;
        if (esSabado) coberturaDia = Math.min(cobertura_sabado, empleado_ids.length);
        if (esDomingo) coberturaDia = Math.min(cobertura_domingo, empleado_ids.length);
        if (esFestivo) coberturaDia = Math.min(cobertura_festivo, empleado_ids.length);
        debeTrabajar = j < coberturaDia;
      }

      let turnoIdx = 0;
      if (tipo_rotacion === 'semanal') {
        const weekOffset = Math.floor(fechaActual.startOf('week').diff(fechaInicio.startOf('week'), 'weeks').weeks);
        const empIdx = empleado_ids.indexOf(empleado.id);
        turnoIdx = (empIdx + weekOffset) % turnos.length;
      } else {
        turnoIdx = empleado_ids.indexOf(empleado.id) % turnos.length;
      }

      const duracion = turnoHours[turnoIdx];
      const currentWeekHrs = horasSemanales.get(empleado.id) || 0;

      if (debeTrabajar && (currentWeekHrs + duracion > horas_max_semana) && esDiaEspecial && !enBloqueEspecial) {
        debeTrabajar = false;
      }

      if (!debeTrabajar) {
        t_inicio = fechaActual.toJSDate();
        t_fin = fechaActual.toJSDate();
        tipo = 'descanso';
      } else {
        const turnoSelected = turnos[turnoIdx];
        const [h_ini, m_ini] = turnoSelected.inicio.split(':');
        const [h_fin, m_fin] = turnoSelected.fin.split(':');

        let dt_ini = fechaActual.set({ hour: parseInt(h_ini), minute: parseInt(m_ini), second: 0, millisecond: 0 });
        let dt_fin = fechaActual.set({ hour: parseInt(h_fin), minute: parseInt(m_fin), second: 0, millisecond: 0 });
        if (dt_fin <= dt_ini) dt_fin = dt_fin.plus({ days: 1 });

        t_inicio = dt_ini.toJSDate();
        t_fin = dt_fin.toJSDate();

        horasSemanales.set(empleado.id, currentWeekHrs + duracion);
        horasTotales.set(empleado.id, (horasTotales.get(empleado.id) || 0) + duracion);

        if (esFestivo) {
          festivosTrabajados.set(empleado.id, (festivosTrabajados.get(empleado.id) || 0) + 1);
        }
      }

      turnosAGenerar.push({
        usuario_id: empleado.id,
        hora_inicio: t_inicio,
        hora_fin: t_fin,
        tipo: tipo,
        publicado: false
      });
    }
  }

  // 3. Insertar masivamente
  for (const t of turnosAGenerar) {
    await turnosService.crearTurno(t);
  }

  return { diasGenerados: numDias, totalTurnos: turnosAGenerar.length };
};

module.exports = {
  getConfiguraciones,
  crearConfiguracion,
  actualizarConfiguracion,
  eliminarConfiguracion,
  generarProgramacion
};
