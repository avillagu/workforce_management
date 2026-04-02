const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WFM API - Workforce Management',
      version: '1.0.0',
      description: 'API REST para el sistema de gestión de fuerza laboral (WFM). ' +
                   'Incluye autenticación, gestión de usuarios, asistencias, novedades y turnos.',
      contact: {
        name: 'MAPO Development Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido mediante el endpoint /auth/login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Identificador único del usuario'
            },
            username: {
              type: 'string',
              description: 'Nombre de usuario para autenticación'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario'
            },
            nombre_completo: {
              type: 'string',
              description: 'Nombre completo del empleado'
            },
            rol: {
              type: 'string',
              enum: ['admin', 'supervisor', 'empleado'],
              description: 'Rol del usuario en el sistema'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Nombre de usuario'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Contraseña del usuario'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa'
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Token JWT para autenticación'
                },
                user: {
                  $ref: '#/components/schemas/User'
                }
              }
            },
            error: {
              type: 'string',
              description: 'Mensaje de error (solo si success es false)'
            }
          }
        },
        MenuItem: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Ruta del menú en el frontend'
            },
            label: {
              type: 'string',
              description: 'Etiqueta visible del menú'
            },
            icon: {
              type: 'string',
              description: 'Nombre del icono Material Design'
            }
          }
        },
        MenuResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'object',
              properties: {
                rol: {
                  type: 'string'
                },
                menu: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/MenuItem'
                  }
                }
              }
            }
          }
        },
        Grupo: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
            descripcion: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        GrupoCreate: {
          type: 'object',
          required: ['nombre'],
          properties: {
            nombre: { type: 'string', minLength: 3, maxLength: 100 },
            descripcion: { type: 'string' }
          }
        },
        GrupoUpdate: {
          type: 'object',
          required: ['nombre'],
          properties: {
            nombre: { type: 'string', minLength: 3, maxLength: 100 },
            descripcion: { type: 'string' }
          }
        },
        Empleado: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            full_name: { type: 'string' },
            role: { type: 'string', enum: ['empleado', 'supervisor', 'admin'] },
            grupo_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        EmpleadoCreate: {
          type: 'object',
          required: ['full_name', 'username', 'password', 'grupo_id'],
          properties: {
            full_name: { type: 'string', minLength: 3, maxLength: 150 },
            username: { type: 'string', minLength: 3, maxLength: 50 },
            password: { type: 'string', minLength: 6 },
            grupo_id: { type: 'string', format: 'uuid' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Descripción del error'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Auth',
        description: 'Endpoints de autenticación y autorización'
      },
      {
        name: 'Health',
        description: 'Endpoints de verificación del sistema'
      },
      {
        name: 'Grupos',
        description: 'Gestión de grupos y agrupación de empleados'
      },
      {
        name: 'Usuarios',
        description: 'Gestión de empleados'
      },
      {
        name: 'Asistencias',
        description: 'Control de estados de asistencia y jornada'
      }
    ]
  },
  apis: [
    './src/routes/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
