import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/operacion.models';
import { SolicitudCambio } from '../models/solicitud.model';
import { Notificacion } from '../models/notificacion.model';
import { TurnosSocketService } from './turnos-socket.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {
  private readonly http = inject(HttpClient);
  private readonly socketService = inject(TurnosSocketService);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/solicitudes`;
  private readonly notifUrl = `${environment.apiUrl}/notificaciones`;

  readonly countPendientes = signal(0);

  constructor() {
    // Escuchar cambios en tiempo real
    this.socketService.onSolicitudesNovedad((payload) => {
      // payload puede ser una solicitud o un aviso de publicación
      this.actualizarContador();
    });

    // Actualizar cuando cambie el usuario (login/logout)
    effect(() => {
      if (this.authService.isAuthenticated()) {
         this.actualizarContador();
      } else {
        this.countPendientes.set(0);
      }
    }, { allowSignalWrites: true });
  }

  private actualizarContador(): void {
    if (!this.authService.isAuthenticated()) return;

    // Obtener solicitudes y notificaciones para el conteo global
    this.getAllVisible().subscribe(list => {
      const myId = this.authService.user()?.id;
      const myRole = this.authService.userRole();
      
      const requestsCount = list.filter(s => {
        if (s.estado_final !== 'abierta') return false;
        if (s.objetivo_id === myId && s.estado_objetivo === 'pendiente') return true;
        if (myRole === 'admin' && s.estado_admin === 'pendiente') return true;
        return false;
      }).length;

      this.getNotificaciones().subscribe(notifs => {
        const notifCount = notifs.filter(n => !n.leido).length;
        this.countPendientes.set(requestsCount + notifCount);
      });
    });
  }

  getNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<ApiResponse<Notificacion[]> | Notificacion[]>(this.notifUrl).pipe(
      map(resp => Array.isArray(resp) ? resp : resp.data ?? [])
    );
  }

  marcarLeida(id: string): Observable<any> {
    return this.http.post(`${this.notifUrl}/${id}/leida`, {}).pipe(
      tap(() => this.actualizarContador())
    );
  }

  getAllVisible(): Observable<SolicitudCambio[]> {
    return this.http.get<ApiResponse<SolicitudCambio[]> | SolicitudCambio[]>(this.baseUrl).pipe(
      map(resp => Array.isArray(resp) ? resp : resp.data ?? [])
    );
  }

  crearSolicitud(objetivoId: string, fecha: string): Observable<SolicitudCambio> {
    return this.http.post<ApiResponse<SolicitudCambio> | SolicitudCambio>(this.baseUrl, {
      objetivo_id: objetivoId,
      fecha
    }).pipe(
      map(resp => (resp as any).data ?? resp),
      tap(() => this.actualizarContador())
    );
  }

  procesar(id: string, decision: 'aprobado' | 'rechazado'): Observable<SolicitudCambio> {
    return this.http.post<ApiResponse<SolicitudCambio> | SolicitudCambio>(`${this.baseUrl}/${id}/procesar`, {
      decision
    }).pipe(
      map(resp => (resp as any).data ?? resp),
      tap(() => this.actualizarContador())
    );
  }
}
