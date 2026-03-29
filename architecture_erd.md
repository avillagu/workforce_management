# Diagrama Entidad-Relación (ERD) — Workforce Management

Este documento actúa como la única fuente de la verdad para el diseño de la base de datos de WFM y evita la creación improvisada de relaciones o tablas por parte del Agente DBA.

```mermaid
erDiagram
    USUARIOS {
        uuid id PK
        string username UK
        string password_hash
        string full_name
        string role "Enum: admin, empleado, supervisor"
        uuid grupo_id FK "Agregado Etapa 2 - Nullable para admin inicial"
        timestamptz created_at "Manejo estricto UTC"
        timestamptz updated_at "Manejo estricto UTC"
    }

    GRUPOS {
        uuid id PK
        string nombre UK "Nombre único del grupo"
        string descripcion
        timestamptz created_at
        timestamptz updated_at
    }

    ASISTENCIAS {
        uuid id PK
        uuid usuario_id FK "Relación indispensable, quién marcó"
        string estado "Enum: disponible, descanso, en_bano, fuera_de_turno"
        timestamptz hora_inicio "Inicio del estado - UTC"
        timestamptz hora_fin "Fin del estado - UTC, nullable si es estado actual"
        timestamptz created_at "Manejo estricto UTC"
    }

    NOVEDADES {
        uuid id PK
        uuid usuario_id FK "Quién reporta"
        string tipo "Ej: Incapacidad, Permiso"
        string descripcion
        timestamptz fecha_inicio
        timestamptz fecha_fin
        string estado "Pendiente, Aprobado, Rechazado"
        timestamptz created_at
    }

    TURNOS {
        uuid id PK
        uuid usuario_id FK "Usuario asignado"
        timestamptz hora_inicio_programada
        timestamptz hora_fin_programada
        string tipo "Enum: turno, descanso, permiso, incapacidad"
        boolean publicado "Default false"
        timestamptz created_at
        timestamptz updated_at
    }

    %% Relaciones (Foreign Keys)
    GRUPOS ||--o{ USUARIOS : "agrupa (1:N)"
    USUARIOS ||--o{ ASISTENCIAS : "registra (1:N)"
    USUARIOS ||--o{ NOVEDADES : "reporta (1:N)"
    USUARIOS ||--o{ TURNOS : "se programa (1:N)"
```

### Reglas de Negocio Asociadas a la BD

1. **Fechas/Horas:** Todas las columnas de marcas temporales y fechas operan bajo el tipo de dato `TIMESTAMPTZ` nativo de PostgreSQL garantizando compatibilidad con cualquier zona horario mediante el Backend.

2. **Llaves Foráneas:** Las entidades transaccionales no pueden existir sin estar vinculadas a un UUID válido en `USUARIOS`. Los nuevos empleados obligatoriamente deben atarse a un `grupo_id`.

3. **Tabla ASISTENCIAS - Reglas Específicas (Etapa 4):**
   - Un usuario puede tener múltiples registros de asistencia por día
   - El estado actual siempre tiene `hora_fin` NULL
   - Al marcar un nuevo estado, el estado anterior debe cerrarse (actualizar `hora_fin`)
   - Estados válidos: `disponible`, `descanso`, `en_bano`, `fuera_de_turno`
   - El cálculo del tiempo total del día es: primer `disponible` → último `fuera_de_turno`

4. **Tabla TURNOS - Actualización (Etapa 3):**
   - Columna `tipo` para diferenciar tipo de programación
   - Columna `publicado` para control de visibilidad
   - Columna `updated_at` para auditoría de cambios
