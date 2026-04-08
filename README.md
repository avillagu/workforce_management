# WFM - Workforce Management System

## Descripción

Sistema de gestión de fuerza laboral para pequeñas empresas (hasta 50 empleados). Desarrollado con Angular (Frontend) y Node.js/Express (Backend), utilizando PostgreSQL como base de datos.

**Etapa 1:** Autenticación y Menú Principal

---

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Angular       │────▶│   Node.js/      │────▶│   PostgreSQL    │
│   (Frontend)    │◀────│   Express       │◀────│   (Database)    │
│   Puerto: 4200  │     │   Puerto: 3000  │     │   Puerto: 5432  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Requisitos Previos

### Software Necesario

1. **Node.js** (v18 o superior)
   - Descargar: https://nodejs.org/

2. **PostgreSQL** (v14 o superior)
   - Descargar: https://www.postgresql.org/download/

3. **pgAdmin 4** (opcional, para gestión de BD)
   - Se incluye con PostgreSQL

4. **Angular CLI** (v17 o superior)
   ```bash
   npm install -g @angular/cli
   ```

---

## Instalación y Configuración

### Paso 1: Configurar la Base de Datos

1. **Crear la base de datos en PostgreSQL:**

   ```sql
   CREATE DATABASE wfm_db;
   ```

2. **Ejecutar el script de inicialización:**

   - Abrir pgAdmin
   - Conectarse a la base de datos `wfm_db`
   - Abrir el Query Tool
   - Copiar y ejecutar el contenido de `backend/database/init_db.sql`

3. **Usuarios de prueba creados automáticamente:**

   | Usuario    | Contraseña  | Rol        |
   |------------|-------------|------------|
   | admin      | Matt5593    | admin      |
   | supervisor | Matt5593    | supervisor |
   | empleado1  | Matt5593    | empleado   |

   > **Nota:** Las contraseñas están hasheadas con bcrypt. Para cambiar contraseñas, use el script SQL correspondiente.

---

### Paso 2: Configurar el Backend

1. **Navegar a la carpeta del backend:**

   ```bash
   cd backend
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **El archivo .env ya está creado** con valores por defecto. Solo necesitas cambiar la contraseña:

   Abre `backend/.env` y modifica:
   ```env
   DB_PASSWORD=tu_contraseña_real_de_postgresql
   ```

   > **⚠️  IMPORTANTE:** La contraseña por defecto es `postgres`. Si cambiaste tu contraseña de PostgreSQL, debes actualizarla en el archivo `.env`.

4. **Verificar configuración (RECOMENDADO):**

   Ejecuta el script de verificación para diagnosticar problemas:
   ```bash
   npm run verify
   ```

   Este script revisa:
   - ✅ Variables de entorno configuradas
   - ✅ Conexión a PostgreSQL
   - ✅ Existencia de la base de datos
   - ✅ Esquema y tablas creados
   - ✅ Usuarios de prueba

5. **Iniciar el servidor:**

   ```bash
   npm start
   ```

   O en modo desarrollo (con auto-reload):

   ```bash
   npm run dev
   ```

   **Verificación:** El servidor debe mostrar información detallada incluyendo el estado de la base de datos.

   > **🔧 Solución de problemas de conexión:**
   > - Si ves "Database: Desconectado", verifica que PostgreSQL esté corriendo
   > - Revisa los mensajes de error en la consola para diagnóstico detallado
   > - Ejecuta `GET /api/db/status` para ver el error específico

---

### Paso 3: Configurar el Frontend

1. **Navegar a la carpeta del frontend:**

   ```bash
   cd frontend
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Iniciar la aplicación Angular:**

   ```bash
   npm start
   ```

   **Verificación:** El navegador debe abrir automáticamente en:
   ```
   http://localhost:4200
   ```

   La aplicación redirigirá automáticamente a `/login`.

---

## Despliegue en Producción (VPS Webdock)

El sistema se encuentra desplegado y operativo en un servidor privado virtual (VPS) administrado en **Webdock**.

### Arquitectura del Servidor
- **Sistema Operativo:** Ubuntu (Webdock VPS).
- **Base de Datos:** PostgreSQL corriendo de manera nativa (`wfm_db`).
- **Backend (API):** Ejecutado y monitorizado en segundo plano con **PM2** bajo el nombre de proceso `wfm-api` (puerto local 3000).
- **Frontend (Angular):** Archivos estáticos de producción compilados y servidos directamente por el servidor web desde el directorio `/var/www/html/`.

### Guía de Actualización (Despliegue Continuo)

**Para actualizar el Frontend:**
1. Compilar localmente la aplicación (`npm run build`).
2. Comprimir el contenido de la carpeta resultante (`/dist/wfm-frontend/browser/`) en un `.zip`.
3. Subir el ZIP al servidor por FTP (p. ej. empleando FileZilla con usuario limitado) directamente a `/var/www/html/`.
4. En la terminal de Webdock, descomprimir y sobrescribir los archivos antiguos (`sudo unzip -o archivo.zip`).
5. Borrar el ZIP sobrante y actualizar la caché del navegador (`Ctrl + F5`).

**Para actualizar el Backend:**
1. Subir por FTP el archivo modificado a la carpeta temporal `/var/www/html/`.
2. En la terminal de Webdock, mover el archivo a la ruta segura de la aplicación:
   `sudo mv /var/www/html/archivo.js /home/admin/workforce_management/backend/src/...`
3. Restablecer propietario/permisos:
   `sudo chown admin:admin [ruta_del_archivo]`
4. Reiniciar la API en memoria para aplicar cambios:
   `pm2 restart wfm-api`

---

## Estructura del Proyecto

```
workforce_management/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   └── auth.js
│   │   └── server.js
│   ├── database/
│   │   └── init_db.sql
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/
│   │   │   │   │   └── auth.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── auth.interceptor.ts
│   │   │   │   ├── models/
│   │   │   │   │   └── auth.models.ts
│   │   │   │   └── services/
│   │   │   │       └── auth.service.ts
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   └── pages/
│   │   │   │   │       └── login/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── programacion/
│   │   │   │   ├── operacion/
│   │   │   │   ├── novedades/
│   │   │   │   └── asistencias/
│   │   │   ├── shared/
│   │   │   │   └── components/
│   │   │       ├── layout/
│   │   │       └── sidebar/
│   │   │   ├── app.component.ts
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   ├── environments/
│   │   │   ├── environment.ts
│   │   │   └── environment.prod.ts
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.scss
│   ├── angular.json
│   └── package.json
│
│
├── docs/
│   ├── 00_brief.txt
│   ├── architecture.txt
│   └── (Archivos de documentación técnica y bitácoras del proyecto)
│
└── README.md

---

## Endpoints de la API

### Autenticación

| Método | Endpoint           | Descripción                    | Auth Requerida |
|--------|-------------------|--------------------------------|----------------|
| POST   | /api/auth/login   | Iniciar sesión                 | No             |
| GET    | /api/auth/me      | Obtener usuario actual         | Sí             |
| GET    | /api/auth/menu    | Obtener menú según rol         | Sí             |

### Health & Documentación

| Método | Endpoint           | Descripción                    | Auth Requerida |
|--------|-------------------|--------------------------------|----------------|
| GET    | /api/health       | Health check                   | No             |
| GET    | /api/db/status    | Estado de la base de datos     | No             |
| GET    | /api-docs         | Documentación Swagger UI       | No             |

### 📚 Documentación Swagger

La API incluye documentación interactiva con Swagger UI. Para acceder:

```
http://localhost:3000/api-docs
```

Desde Swagger UI puedes:
- Ver todos los endpoints disponibles
- Probar los endpoints directamente desde el navegador
- Ver esquemas de request/response
- Autenticarte con JWT para endpoints protegidos

### Ejemplo de Login

**Request:**
```json
POST http://localhost:3000/api/auth/login
{
  "username": "admin",
  "password": "Matt5593"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@wfm.com",
      "nombre_completo": "Administrador del Sistema",
      "rol": "admin"
    }
  }
}
```

---

## Características Implementadas

### ✅ Backend
- [x] Servidor Express configurado
- [x] Endpoint de login con validación
- [x] Conexión a PostgreSQL con pool
- [x] Hash de contraseñas con bcrypt
- [x] Autenticación basada en JWT
- [x] Middleware de validación de tokens
- [x] Menú dinámico según rol de usuario
- [x] Manejo de errores estructurado
- [x] Documentación Swagger UI en /api-docs
- [x] Librería luxon para manejo de fechas UTC

### ✅ Frontend
- [x] Componente de Login con diseño profesional
- [x] Guards de ruta para protección
- [x] Sidebar desplegable con animaciones
- [x] Navegación por rutas protegidas
- [x] Servicio de autenticación con Signals
- [x] Interceptor HTTP para tokens
- [x] Diseño responsive
- [x] UI con Angular Material

### 📋 Menú del Sistema
- Dashboard (Principal)
- Programación
- Operación
- Novedades
- Asistencias

---

## Solución de Problemas

### 🔌 Errores de Conexión a Base de Datos

El servidor ahora incluye diagnóstico detallado. Si hay problemas de conexión:

**1. Verifica los mensajes en la consola del servidor**

El servidor mostrará mensajes específicos como:
```
❌ Error de conexión (intento 1/5): password authentication failed for user "postgres"
   → Contraseña incorrecta para el usuario postgres
   → Verifica DB_PASSWORD en tu archivo .env
```

**2. Errores comunes y soluciones:**

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` | PostgreSQL no está corriendo | Inicia el servicio de PostgreSQL |
| `password authentication failed` | Contraseña incorrecta | Edita `.env` y corrige `DB_PASSWORD` |
| `database "wfm_db" does not exist` | BD no existe | Ejecuta: `CREATE DATABASE wfm_db;` |
| `role "postgres" does not exist` | Usuario no existe | Verifica `DB_USER` en `.env` |
| `schema "wfm_auth" does not exist` | Esquema no existe | Ejecuta el script `init_db.sql` |

**3. Verificar estado de la conexión:**

```bash
# Desde el navegador o terminal
http://localhost:3000/api/db/status
```

Respuesta exitosa:
```json
{
  "success": true,
  "status": "connected",
  "message": "Conexión a base de datos exitosa"
}
```

**4. Pasos de verificación:**

```bash
# 1. Verificar que PostgreSQL esté corriendo (Windows)
# Abre el Administrador de tareas y busca "postgres.exe"

# 2. Probar conexión con psql
psql -U postgres -h localhost -p 5432

# 3. Verificar que la base de datos existe
psql -U postgres -c "\l" | findstr wfm_db

# 4. Revisar el archivo .env
cat backend/.env | findstr DB_PASSWORD
```

---

### 🌐 Error: "CORS error" en el navegador

1. Verificar que el backend esté corriendo en puerto 3000
2. Confirmar que el frontend esté corriendo en puerto 4200
3. El CORS ya está configurado para ambos puertos

---

### 🔑 Error: "Token expirado"

1. El token JWT expira después de 8 horas (configurable en `.env`)
2. Iniciar sesión nuevamente
3. Para cambiar la expiración, modifica `JWT_EXPIRES_IN=8h` en `.env`

---

### 📦 Error: "Cannot find module"

1. Ejecutar `npm install` en `backend/`
2. Ejecutar `npm install` en `frontend/`
3. Verificar que Node.js sea v18 o superior: `node --version`

---

### 🔐 Error: "Credenciales inválidas" en login

1. Verificar usuario y contraseña (por defecto: `admin` / `Matt5593`)
2. Confirmar que la base de datos está conectada
3. Revisar logs del servidor para más detalles

---

## Seguridad

- **Contraseñas:** Hasheadas con bcrypt (10 rounds)
- **Tokens:** JWT con expiración configurable
- **CORS:** Configurado para localhost:4200
- **Validación:** Express-validator en endpoints

---

## Progreso del Proyecto

- ✅ **Etapa 1:** Autenticación y Menú Principal
- ✅ **Etapa 2:** Módulo de Operación (Gestión de Empleados)
- ✅ **Etapa 3:** Módulo de Programación (Turnos, Calendario, Smart Scheduling y Compensatorios)
- ✅ **Etapa 4:** Módulo de Novedades y Asistencias
- ⏳ **Etapa 5:** Reportes y Exportación Avanzada

---

## Contacto y Soporte

Para consultas o soporte técnico, contactar al equipo de desarrollo.

---

**© 2026 WFM System - Versión 1.0.0**
