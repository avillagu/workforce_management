import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { User, LoginRequest, LoginResponse, MenuResponse, MenuItem } from '../models/auth.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  
  // Signals para estado reactivo
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _menu = signal<MenuItem[]>([]);
  private readonly _isAuthenticated = signal<boolean>(false);

  // Computed signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly menu = this._menu.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly userName = computed(() => this._user()?.nombre_completo ?? '');
  readonly userLogin = computed(() => this._user()?.username ?? '');
  readonly userRole = computed(() => this._user()?.rol ?? '');
  readonly userGroup = computed(() => this._user()?.grupo_nombre ?? '');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadSession();
  }

  /**
   * Inicia sesión con las credenciales proporcionadas
   */
  login(credentials: LoginRequest) {
    return new Promise<boolean>((resolve, reject) => {
      this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.setSession(response.data.token, response.data.user);
              this.router.navigate(['/dashboard']);
              resolve(true);
            } else {
              reject(response.error || 'Error en el login');
            }
          },
          error: (error) => {
            const errorMessage = error.error?.error || 'Error de conexión con el servidor';
            reject(errorMessage);
          }
        });
    });
  }

  /**
   * Obtiene el menú del usuario autenticado
   */
  loadMenu(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<MenuResponse>(`${this.API_URL}/auth/menu`)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this._menu.set(response.data.menu);
              resolve();
            } else {
              reject(response.error);
            }
          },
          error: (error) => reject(error)
        });
    });
  }

  /**
   * Cierra sesión y limpia el estado
   */
  logout(): void {
    this._user.set(null);
    this._token.set(null);
    this._menu.set([]);
    this._isAuthenticated.set(false);
    localStorage.removeItem('wfm_token');
    localStorage.removeItem('wfm_user');
    this.router.navigate(['/login']);
  }

  /**
   * Guarda la sesión en localStorage y actualiza el estado
   */
  private setSession(token: string, user: any): void {
    const normalizedUser = this.normalizeUser(user);
    this._token.set(token);
    this._user.set(normalizedUser);
    this._isAuthenticated.set(true);
    localStorage.setItem('wfm_token', token);
    localStorage.setItem('wfm_user', JSON.stringify(normalizedUser));
  }

  /**
   * Carga la sesión desde localStorage si existe
   */
  private loadSession(): void {
    const token = localStorage.getItem('wfm_token');
    const userStr = localStorage.getItem('wfm_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const normalizedUser = this.normalizeUser(user);
        this._token.set(token);
        this._user.set(normalizedUser);
        this._isAuthenticated.set(true);
        this.loadMenu().catch(() => this.clearSession());
        this.loadUser().catch(() => {});
      } catch (e) {
        this.clearSession();
      }
    }
  }

  /**
   * Obtiene la información del usuario actual (fresca de DB)
   */
  loadUser(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<{success: boolean, data: any, error?: string}>(`${this.API_URL}/auth/me`)
        .subscribe({
          next: (response) => {
            if (response.success) {
              const normalizedUser = this.normalizeUser(response.data);
              this._user.set(normalizedUser);
              localStorage.setItem('wfm_user', JSON.stringify(normalizedUser));
              resolve();
            } else {
              reject(response.error);
            }
          },
          error: (error) => reject(error)
        });
    });
  }

  private normalizeUser(user: any): User {
    if (!user) return user;
    return {
      ...user,
      rol: user.rol || user.role,
      nombre_completo: user.nombre_completo || user.full_name
    };
  }

  /**
   * Cambia la contraseña del usuario actual
   */
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put<{success: boolean, message?: string, error?: string}>(`${this.API_URL}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  /**
   * Limpia la sesión si hay errores
   */
  private clearSession(): void {
    localStorage.removeItem('wfm_token');
    localStorage.removeItem('wfm_user');
    this._token.set(null);
    this._user.set(null);
    this._isAuthenticated.set(false);
  }
}
