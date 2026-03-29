export type TipoTurno = 'turno' | 'descanso' | 'permiso' | 'incapacidad';

export interface Turno {
  id: string;
  usuario_id: string;
  empleado_nombre?: string;
  hora_inicio: string; // ISO 8601 UTC
  hora_fin: string;    // ISO 8601 UTC
  tipo?: TipoTurno;
  publicado: boolean;
  created_at: string;
}

export interface TurnoSocketEvento {
  accion: 'crear' | 'actualizar' | 'eliminar' | 'masivo';
  turno?: Turno;
  data?: any;
}

export interface TurnoPayload {
  usuario_id: string;
  hora_inicio: string;
  hora_fin: string;
  tipo?: TipoTurno;
}

export interface ProgramacionMasivaDto {
  empleado_ids: string[];
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
  hora_inicio: string;  // HH:mm
  hora_fin: string;     // HH:mm
  tipo?: TipoTurno;
  dias_semana?: number[]; // [1,2,3,4,5] (1=Lunes, 7=Domingo)
  excluir_fines_de_semana?: boolean;
  sobrescribir?: boolean;
}

export interface ProgramacionMasivaResponse {
  success: boolean;
  data?: {
    turnos_creados: number;
    detalle?: string;
  };
  error?: string;
  detalles?: string;
}
