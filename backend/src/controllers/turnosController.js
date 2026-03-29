const turnosService = require('../services/turnosService');

/**
 * Obtener todos los turnos en un rango
 */
const getTurnos = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, error: 'Se requieren fecha_inicio y fecha_fin (YYYY-MM-DD)' });
    }
    
    // Asegurar formato ISO para luxon si viene solo YYYY-MM-DD
    const start = fecha_inicio.includes('T') ? fecha_inicio : `${fecha_inicio}T00:00:00Z`;
    const end = fecha_fin.includes('T') ? fecha_fin : `${fecha_fin}T23:59:59Z`;

    const turnos = await turnosService.getTurnos(start, end);
    res.json({ success: true, data: turnos });
  } catch (error) {
    console.error('Error en getTurnos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener turnos' });
  }
};

/**
 * Obtener turnos de un empleado
 */
const getTurnosEmpleado = async (req, res) => {
  try {
    const { usuario_id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, error: 'Se requieren fecha_inicio y fecha_fin' });
    }

    const start = fecha_inicio.includes('T') ? fecha_inicio : `${fecha_inicio}T00:00:00Z`;
    const end = fecha_fin.includes('T') ? fecha_fin : `${fecha_fin}T23:59:59Z`;

    const turnos = await turnosService.getTurnosEmpleado(usuario_id, start, end);
    res.json({ success: true, data: turnos });
  } catch (error) {
    console.error('Error en getTurnosEmpleado:', error);
    res.status(500).json({ success: false, error: 'Error al obtener turnos del empleado' });
  }
};

/**
 * Crear un turno
 */
const crearTurno = async (req, res) => {
  try {
    const { usuario_id, hora_inicio, hora_fin, tipo } = req.body;
    if (!usuario_id || !hora_inicio || !hora_fin) {
      return res.status(400).json({ success: false, error: 'Campos requeridos faltantes' });
    }

    const nuevoTurno = await turnosService.crearTurno({ usuario_id, hora_inicio, hora_fin, tipo });
    res.status(201).json({ success: true, data: nuevoTurno });
  } catch (error) {
    console.error('Error en crearTurno:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar un turno
 */
const actualizarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, hora_inicio, hora_fin, tipo } = req.body;

    if (!hora_inicio || !hora_fin) {
      return res.status(400).json({ success: false, error: 'hora_inicio y hora_fin son requeridas' });
    }

    const actualizado = await turnosService.actualizarTurno(id, { usuario_id, hora_inicio, hora_fin, tipo });
    res.json({ success: true, data: actualizado });
  } catch (error) {
    console.error('Error en actualizarTurno:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar un turno
 */
const eliminarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    await turnosService.eliminarTurno(id);
    res.json({ success: true, message: 'Turno eliminado correctamente' });
  } catch (error) {
    console.error('Error en eliminarTurno:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * Programación masiva
 */
const programacionMasiva = async (req, res) => {
  try {
    const { empleado_ids, fecha_inicio, fecha_fin, hora_inicio, hora_fin, tipo, dias_semana, sobrescribir } = req.body;
    
    if (!empleado_ids || !fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros para programación masiva' });
    }

    const resultado = await turnosService.programacionMasiva({
      empleado_ids,
      fecha_inicio,
      fecha_fin,
      hora_inicio,
      hora_fin,
      tipo,
      dias_semana,
      sobrescribir
    });

    res.status(201).json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error en programacionMasiva:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar turnos de forma masiva
 */
const eliminarTurnosMasivo = async (req, res) => {
  try {
    const { empleado_ids, fecha_inicio, fecha_fin, dias_semana } = req.body;
    
    if (!empleado_ids || !fecha_inicio || !fecha_fin || !dias_semana) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros para eliminación masiva' });
    }

    const resultado = await turnosService.eliminarTurnosMasivo({
      empleado_ids,
      fecha_inicio,
      fecha_fin,
      dias_semana
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error en eliminarTurnosMasivo:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * Mover un turno a otro usuario/fecha o intercambiar
 */
const moverTurno = async (req, res) => {
  try {
    const { id, destino_usuario_id, destino_fecha } = req.body;
    if (!id || !destino_usuario_id || !destino_fecha) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros: id, destino_usuario_id, destino_fecha' });
    }

    const resultado = await turnosService.moverTurno(id, destino_usuario_id, destino_fecha);
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error en moverTurno:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Publicar todos los borradores (Global)
 */
const publicarTurnos = async (req, res) => {
  try {
    const resultado = await turnosService.publicarTurnos();
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error en publicarTurnos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getTurnos,
  getTurnosEmpleado,
  crearTurno,
  actualizarTurno,
  eliminarTurno,
  programacionMasiva,
  eliminarTurnosMasivo,
  moverTurno,
  publicarTurnos
};
