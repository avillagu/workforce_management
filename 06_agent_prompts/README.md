# Agent Prompts - Workforce Management

Esta carpeta contiene todos los prompts y definiciones de agentes utilizados para el desarrollo del sistema WFM.

---

## Definición de Agentes

| Archivo | Descripción |
|---------|-------------|
| `agent_fullstack.txt` | Definición del agente Fullstack (backend + frontend) |
| `agent_dba.txt` | Definición del agente DBA (base de datos) |

---

## Prompts por Etapa

### Etapa 2 - Grupos y Usuarios
| Archivo | Descripción |
|---------|-------------|
| `prompt_backend_etapa2.txt` | API REST para gestión de grupos y usuarios |
| `prompt_dba_etapa2.txt` | Script SQL para tabla de grupos |
| `prompt_frontend_etapa2.txt` | Componentes Angular para gestión de grupos |

### Etapa 3 - Programación de Turnos
| Archivo | Descripción |
|---------|-------------|
| `prompt_backend_etapa3.txt` | API REST para programación de turnos, validación de conflictos, WebSocket |
| `prompt_frontend_etapa3.txt` | Componentes Angular para calendario de programación, diálogos, drag & drop |

### Etapa 4 - Asistencias
| Archivo | Descripción |
|---------|-------------|
| `prompt_backend_etapa4.txt` | API REST para control de asistencias, WebSocket en tiempo real |
| `prompt_frontend_etapa4.txt` | Componentes Angular para panel de marcación y monitoreo de asistencias |

---

## Prompts Especiales

| Archivo | Descripción |
|---------|-------------|
| `prompt_dba.txt` | Prompt base para agente DBA (configuración general) |
| `prompt_frontend_redesign.txt` | Rediseño de interfaz (login, layout premium) |
| `prompt_fullstack.txt` | Prompt general para desarrollo fullstack |

---

## Estructura de Prompts

Todos los prompts siguen la estructura:
1. **ROL** - Definición del rol del agente
2. **OBJETIVO** - Meta principal de la etapa
3. **CONTEXTO** - Información del proyecto y estado actual
4. **TAREAS PRINCIPALES** - Lista detallada de tareas a realizar
5. **RESTRICCIONES** - Reglas y limitaciones técnicas
6. **INPUTS** - Archivos de referencia
7. **OUTPUTS ESPERADOS** - Archivos a generar
8. **CRITERIOS DE ACEPTACIÓN** - Lista de validación
9. **EJEMPLOS** - Request/response, código de ejemplo

---

## Uso

Para utilizar estos prompts:
1. Copiar el contenido del archivo correspondiente
2. Pegar en el chat con el agente
3. El agente generará el código/documentación esperada

---

**Nota:** Estos archivos son de referencia histórica y para futuras etapas. No modifican el funcionamiento del sistema.
