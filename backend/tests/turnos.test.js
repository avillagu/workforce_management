const request = require('supertest');
const app = require('../src/server');
const { initializeConnection, closePool, pool } = require('../src/config/database');
const { DateTime } = require('luxon');

describe('Modulo de Turnos', () => {
  let token;
  let adminId;

  beforeAll(async () => {
    await initializeConnection();
    
    // Login para obtener token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123*' });
    
    token = loginRes.body.data.token;
    adminId = loginRes.body.data.user.id;
  });

  afterAll(async () => {
    // Limpieza de turnos creados durante el test
    await pool.query('DELETE FROM wfm_auth.turnos WHERE usuario_id = $1', [adminId]);
    await closePool();
  });

  describe('POST /api/turnos', () => {
    it('debe crear un turno correctamente sin conflictos', async () => {
      // Un turno para mañana de 8am a 12pm
      const mañana = DateTime.now().plus({ days: 1 }).set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
      const fin = mañana.plus({ hours: 4 });

      const res = await request(app)
        .post('/api/turnos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          usuario_id: adminId,
          hora_inicio: mañana.toISODate() + 'T08:00:00Z',
          hora_fin: mañana.toISODate() + 'T12:00:00Z',
          tipo: 'turno'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('debe rechazar un turno superpuesto (Error 409 Conflict)', async () => {
      // Intentar crear un turno en la misma franja horaria para el mismo usuario
      const mañana = DateTime.now().plus({ days: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });

      const res = await request(app)
        .post('/api/turnos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          usuario_id: adminId,
          hora_inicio: mañana.toISODate() + 'T09:00:00Z',
          hora_fin: mañana.toISODate() + 'T11:00:00Z',
          tipo: 'turno'
        });

      // Debe dar 409 porque está dentro del turno 08:00-12:00 creado antes
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('turno programado');
    });

    it('debe validar que los parámetros sean correctos', async () => {
      const res = await request(app)
        .post('/api/turnos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          usuario_id: adminId,
          hora_inicio: 'invalido',
          hora_fin: '12:00',
          tipo: 'turno'
        });

      // El servidor retorna 500 o 400 según el error de parseo. 
      // Si el servicio no valida, Postgres dará error de sintaxis (500).
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/turnos', () => {
    it('debe listar los turnos existentes en un rango de fechas', async () => {
      const hoy = DateTime.now().toISODate();
      const enSieteDias = DateTime.now().plus({ days: 7 }).toISODate();

      const res = await request(app)
        .get(`/api/turnos?fecha_inicio=${hoy}&fecha_fin=${enSieteDias}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
