export interface User {
  id: string; // El backend devuelve UUID
  username: string;
  nombre_completo: string;
  rol: 'admin' | 'supervisor' | 'empleado';
  grupo_id?: string;
  grupo_nombre?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  error?: string;
}

export interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

export interface MenuResponse {
  success: boolean;
  data: {
    rol: string;
    menu: MenuItem[];
  };
  error?: string;
}
