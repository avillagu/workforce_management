const request = require('supertest');
const app = require('../src/server');
const { initializeConnection } = require('../src/config/database');

describe('Modulo de Autenticación', () => {
  beforeAll(async () => {
    // Asegurar que la base de datos esté lista antes de los tests
    await initializeConnection();
  });
  describe('POST /api/auth/login', () => {
    it('debe aceptar credenciales de administrador correctas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123*'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.rol).toBe('admin');
    });

    it('debe rechazar credenciales incorrectas (contraseña errónea)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password_incorrecto'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('debe rechazar usuarios que no existen', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'usuario_fantasma',
          password: 'algun_password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('debe validar que los campos sean obligatorios (Error 400)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('debe rechazar acceso sin token', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });
  });

  afterAll(async () => {
    const { closePool } = require('../src/config/database');
    await closePool();
  });
});
