export interface Notificacion {
  id: string;
  tipo: 'cambio_turno' | 'publicacion_turnos' | 'sistema';
  referencia_id?: string;
  usuario_id: string;
  mensaje: string;
  detalles?: any;
  leido: boolean;
  created_at: string;
}
