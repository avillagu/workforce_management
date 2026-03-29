/**
 * Models for Operación module
 * Defines Grupo and Empleado entities
 */

export interface Grupo {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrupoCreate {
  nombre: string;
  descripcion: string;
  activo?: boolean;
}

export interface GrupoUpdate {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface Empleado {
  id: string;
  nombre_completo: string;
  username: string;
  grupo_id: string | null;
  grupo_nombre?: string;
  rol: 'empleado' | 'supervisor' | 'admin';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmpleadoCreate {
  nombre_completo: string;
  username: string;
  password: string;
  grupo_id: string | null;
  rol?: 'empleado' | 'supervisor' | 'admin';
}

export interface EmpleadoUpdate {
  nombre_completo: string;
  grupo_id: string | null;
  rol: 'empleado' | 'supervisor' | 'admin';
  activo: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
}
