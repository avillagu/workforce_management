# 🚀 Guía de Configuración Rápida - WFM Backend

## ⚡ Configuración en 5 Pasos

### Paso 1: Instalar Dependencias
```bash
cd backend
npm install
```

### Paso 2: Verificar PostgreSQL
Asegúrate de que PostgreSQL esté corriendo en tu sistema.

**Windows:**
- Abre el Administrador de tareas
- Busca "postgres.exe" en la pestaña Detalles
- Si no está, inicia PostgreSQL desde el menú Inicio

### Paso 3: Crear Base de Datos
Abre pgAdmin y ejecuta:
```sql
CREATE DATABASE wfm_db;
```

Luego ejecuta el script de inicialización:
```sql
-- Ejecuta el contenido de: database/init_db.sql
```

### Paso 4: Configurar Contraseña
Abre el archivo `.env` y cambia:
```env
DB_PASSWORD=postgres
```

Por tu contraseña real de PostgreSQL.

**¿No conoces tu contraseña?**
- Por defecto PostgreSQL usa: `postgres`
- Si la cambiaste durante la instalación, usa esa contraseña
- Si la olvidaste, puedes resetearla en pgAdmin

### Paso 5: Iniciar Servidor
```bash
npm start
```

Verás un mensaje como este si todo está correcto:
```
╔══════════════════════════════════════════════════════════╗
║           WFM Backend - API Server                       ║
╠══════════════════════════════════════════════════════════╣
║  ✓ Servidor corriendo en puerto 3000                    ║
║  ✓ Environment: development                             ║
║  ✓ CORS: Angular (localhost:4200)                       ║
╠══════════════════════════════════════════════════════════╣
║  ✓ Database: Conectado                                  ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🔍 Verificación

### Verificar Estado de la Base de Datos
Abre tu navegador y visita:
```
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

### Verificar Health Check
```
http://localhost:3000/api/health
```

---

## 🐛 Solución de Problemas Comunes

### ❌ "Database: Desconectado"

**Verifica:**
1. PostgreSQL está corriendo
2. La base de datos `wfm_db` existe
3. La contraseña en `.env` es correcta

**Comandos de diagnóstico:**
```bash
# Probar conexión con psql
psql -U postgres -h localhost -p 5432

# Verificar bases de datos existentes
psql -U postgres -c "\l"
```

### ❌ "password authentication failed"

**Solución:**
1. Abre `backend/.env`
2. Cambia `DB_PASSWORD=postgres` por tu contraseña real
3. Reinicia el servidor

### ❌ "database wfm_db does not exist"

**Solución:**
```sql
-- En pgAdmin, ejecuta:
CREATE DATABASE wfm_db;
```

### ❌ "schema wfm_auth does not exist"

**Solución:**
```sql
-- En pgAdmin, ejecuta el script:
-- backend/database/init_db.sql
```

### ❌ "Puerto 3000 ya está en uso"

**Solución:**
1. Abre `backend/.env`
2. Cambia `PORT=3000` por otro puerto: `PORT=3001`
3. Reinicia el servidor

---

## 📋 Credenciales de Acceso

Una vez iniciado el sistema:

| Usuario    | Contraseña | Rol        |
|------------|------------|------------|
| admin      | Matt5593   | admin      |
| supervisor | Matt5593   | supervisor |
| empleado1  | Matt5593   | empleado   |

---

## 📞 ¿Necesitas Ayuda?

Revisa el archivo `README.md` para documentación completa o consulta el `log.txt` para ver el registro detallado de actividades.
