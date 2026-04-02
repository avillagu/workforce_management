---
description: Cómo desplegar cambios del backend y frontend al servidor Webdock VPS
---

# Despliegue en Servidor Webdock VPS

## Datos del Servidor
- **IP:** 193.180.211.179
- **Dominio:** workforceman.vps.webdock.cloud
- **Usuario Shell (SSH/terminal):** admin / XKe5dF2MXC5Z
- **Usuario FTP (FileZilla):** workforceman / RWfQnE5EQUPF
- **Base de datos:** PostgreSQL, nombre `wfm_db`, usuario `wfm_user`, esquema `wfm_auth`

## Rutas Importantes en el Servidor
- **Frontend (archivos web):** `/var/www/html/`
- **Backend (API Node.js):** `/home/admin/workforce_management/backend/`
- **Archivo .env del servidor:** `/home/admin/workforce_management/backend/.env`

## ⚠️ REGLAS CRÍTICAS - LEER ANTES DE HACER CUALQUIER CAMBIO

### 1. NUNCA subir el archivo .env local al servidor
El `.env` local tiene valores diferentes al del servidor:
- Local: `DB_NAME=Workforce_Management_AAA`, `DB_USER=postgres`, `DB_PASSWORD=Matt5593`
- Servidor: `DB_NAME=wfm_db`, `DB_USER=wfm_user`
Si se sube un ZIP del backend, **EXCLUIR el archivo .env** o restaurarlo después.

### 2. El backend se gestiona con PM2, NO con nohup/kill
El servidor usa **PM2** como gestor de procesos. El nombre de la app es `wfm-api`.
- **NUNCA usar:** `killall node`, `pkill`, `nohup node ...`
- **SIEMPRE usar:** `pm2 restart wfm-api`
- Ver logs: `pm2 logs wfm-api --lines 20`
- Ver estado: `pm2 status`

### 3. El frontend usa `/api` como URL base (NO localhost)
El archivo `frontend/src/environments/environment.ts` debe tener `apiUrl: '/api'` (NO `http://localhost:3000/api`).
El servidor Nginx hace proxy de `/api` → `localhost:3000` internamente.

---

## Procedimiento: Desplegar cambios en el BACKEND

### Opción A: Cambio pequeño (1-2 archivos) — RECOMENDADO
Editar directamente en el servidor usando la terminal de Webdock (Panel > Shell):

```bash
# 1. Editar el archivo directamente con sed o nano
sudo nano /home/admin/workforce_management/backend/src/controllers/archivo.js

# 2. Reiniciar el servidor con PM2
pm2 restart wfm-api

# 3. Verificar que arrancó correctamente
pm2 logs wfm-api --lines 10
```

### Opción B: Cambio grande (muchos archivos)
1. Crear ZIP del backend local **EXCLUYENDO node_modules Y .env**:
   ```powershell
   # En PowerShell local:
   Get-ChildItem -Path 'D:\Documents\MAPO\03_PROJECTS\workforce_management\backend' -Exclude node_modules,.env | Compress-Archive -DestinationPath 'D:\Documents\MAPO\03_PROJECTS\workforce_management\backend_update.zip' -Force
   ```

2. Subir por FileZilla (conexión FTP, usuario `workforceman`) a `/var/www/html/`

3. En la terminal de Webdock:
   ```bash
   # Hacer backup del .env antes
   cp /home/admin/workforce_management/backend/.env /home/admin/.env.backup

   # Mover y descomprimir
   cd /home/admin/workforce_management/backend/
   sudo mv /var/www/html/backend_update.zip .
   sudo unzip -o backend_update.zip

   # Restaurar .env del servidor (IMPORTANTÍSIMO)
   cp /home/admin/.env.backup /home/admin/workforce_management/backend/.env

   # Reiniciar con PM2
   pm2 restart wfm-api
   pm2 logs wfm-api --lines 10
   ```

---

## Procedimiento: Desplegar cambios en el FRONTEND

1. Asegurarse de que `environment.ts` tenga `apiUrl: '/api'` (NO localhost)

2. Compilar para producción:
   ```powershell
   # En PowerShell local:
   cd D:\Documents\MAPO\03_PROJECTS\workforce_management\frontend
   npx ng build
   ```

3. Crear ZIP del build:
   ```powershell
   Compress-Archive -Path 'D:\Documents\MAPO\03_PROJECTS\workforce_management\frontend\dist\wfm-frontend\browser\*' -DestinationPath 'D:\Documents\MAPO\03_PROJECTS\workforce_management\frontend_prod.zip' -Force
   ```

4. Subir `frontend_prod.zip` por FileZilla a `/var/www/html/`

5. En la terminal de Webdock:
   ```bash
   cd /var/www/html
   sudo unzip -o frontend_prod.zip
   ```

6. Refrescar la página con Ctrl+F5

---

## Verificación Post-Despliegue
```bash
# Estado del servidor
pm2 status

# Logs recientes
pm2 logs wfm-api --lines 20

# Verificar que la API responde
curl -s http://localhost:3000/api/auth/menu | head -20

# Ver usuarios en la base de datos
sudo -u postgres psql -d wfm_db -c "SELECT username, full_name, role FROM wfm_auth.usuarios;"
```
