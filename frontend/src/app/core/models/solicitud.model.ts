export interface SolicitudCambio {
  id: string;
  solicitante_id: string;
  objetivo_id: string;
  fecha: string;
  turno_solicitante_id?: string;
  turno_objetivo_id?: string;
  estado_objetivo: 'pendiente' | 'aprobado' | 'rechazado';
  estado_admin: 'pendiente' | 'aprobado' | 'rechazado';
  estado_final: 'abierta' | 'aprobada' | 'rechazada';
  created_at: string;
  
  // Joins
  solicitante_nombre?: string;
  objetivo_nombre?: string;
  hora_inicio_solicitante?: string;
  hora_fin_solicitante?: string;
  hora_inicio_objetivo?: string;
  hora_fin_objetivo?: string;
}
