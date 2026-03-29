import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';

export interface DashboardStats {
  total_empleados: number;
  empleados_activos: number;
  turnos_hoy: number;
  novedades_pendientes: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/dashboard`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<{ success: boolean; data: DashboardStats }>(`${this.API_URL}/stats`)
      .pipe(map(res => res.data));
  }
}
