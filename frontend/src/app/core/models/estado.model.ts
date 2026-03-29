export interface RegistroAsistencia {
  id: string;
  usuario_id: string;
  estado: EstadoTipo;
  hora_inicio: string; // ISO 8601 UTC
  hora_fin: string | null;
  created_at: string;
  duracion?: string; // Calculada "2h 30m"
}

export type EstadoTipo = 'disponible' | 'descanso' | 'en_bano' | 'fuera_de_turno';

export interface EstadoActual {
  usuario_id: string;
  nombre: string;
  usuario_nombre: string;
  grupo_id: string;
  grupo_nombre: string;
  estado: EstadoTipo;
  hora_inicio: string;
  tiempo_en_estado: string;
  alerta?: boolean; // true si descanso >30 min
  tiempo_total_dia?: string;
  turno_hoy?: string;
}

export interface TiempoTotal {
  usuario_id: string;
  fecha: string;
  primer_disponible: string;
  ultimo_fuera_de_turno: string;
  horas: number;
  minutos: number;
  segundos: number;
  total_segundos: number;
  texto?: string; 
}

export interface HistorialFiltros {
  desde?: string;
  hasta?: string;
  grupo_id?: string;
  usuario_id?: string;
  limit?: number;
}

export interface EstadoActualizadoEvento {
  usuario_id: string;
  usuario_nombre: string;
  estado: EstadoTipo;
  hora_inicio: string;
  grupo_id: string;
}
