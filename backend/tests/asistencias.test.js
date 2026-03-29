const request = require('supertest');
const app = require('../src/server');
const { initializeConnection, closePool } = require('../src/config/database');

describe('Modulo de Asistencias', () => {
  let token;

  beforeAll(async () => {
    await initializeConnection();
    
    // Login para obtener token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123*' });
    
    token = loginRes.body.data.token;
  });

  afterAll(async () => {
    await closePool();
  });

  describe('POST /api/asistencias/marcar', () => {
    it('debe marcar estado "disponible" correctamente', async () => {
      const res = await request(app)
        .post('/api/asistencias/marcar')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'disponible' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.estado).toBe('disponible');
    });

    it('debe rechazar un estado duplicado (409)', async () => {
      // Intentar marcar el mismo estado dos veces seguidas
      const res = await request(app)
        .post('/api/asistencias/marcar')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'disponible' });

      // Si el usuario ya estaba en 'disponible' (por el test anterior), 
      // el servicio debería retornar 409 o al menos manejar la lógica de negocio.
      // El asistenciasService.marcarEstado maneja esto lanzando Error 409 si es duplicado.
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('debe rechazar estados que no están en la lista blanca', async () => {
      const res = await request(app)
        .post('/api/asistencias/marcar')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'jugando' });

      expect(res.status).toBe(400); // Bad Request por validación
      expect(res.body.success).toBe(false);
    });

    it('debe marcar estado "fuera_de_turno" para finalizar', async () => {
      const res = await request(app)
        .post('/api/asistencias/marcar')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'fuera_de_turno' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/asistencias/estado-actual', () => {
    it('debe retornar los estados actuales (admin/supervisor)', async () => {
      const res = await request(app)
        .get('/api/asistencias/estado-actual')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
