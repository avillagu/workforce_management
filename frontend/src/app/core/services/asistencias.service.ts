import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@env/environment';
import { 
  RegistroAsistencia, 
  EstadoActual, 
  HistorialFiltros, 
  TiempoTotal, 
  EstadoTipo 
} from '@core/models/estado.model';

@Injectable({ providedIn: 'root' })
export class AsistenciasService {
  private readonly API_BASE = `${environment.apiUrl}/asistencias`;

  constructor(private http: HttpClient) {}

  marcarEstado(estado: EstadoTipo): Observable<RegistroAsistencia> {
    return this.http.post<{ success: boolean, data: RegistroAsistencia }>(
      `${this.API_BASE}/marcar`,
      { estado }
    ).pipe(map(res => res.data));
  }

  getHistorial(filtros: HistorialFiltros): Observable<RegistroAsistencia[]> {
    return this.http.get<{ success: boolean, data: RegistroAsistencia[] }>(
      `${this.API_BASE}/historial`,
      { params: filtros as any }
    ).pipe(map(res => res.data));
  }

  getEstadoActual(grupoId?: string): Observable<EstadoActual[]> {
    let params: any = {};
    if (grupoId) {
      params.grupo_id = grupoId;
    }
    return this.http.get<{ success: boolean; data: EstadoActual[] }>(
      `${this.API_BASE}/estado-actual`,
      { params }
    ).pipe(map(res => res.data));
  }

  getMisEstados(): Observable<RegistroAsistencia[]> {
    return this.http.get<{ success: boolean, data: RegistroAsistencia[] }>(
      `${this.API_BASE}/mis-estados`
    ).pipe(map(res => res.data));
  }

  getTiempoTotal(usuarioId: string, fecha: string): Observable<TiempoTotal> {
    return this.http.get<{ success: boolean, data: TiempoTotal }>(
      `${this.API_BASE}/tiempo-total`,
      { params: { usuario_id: usuarioId, fecha } }
    ).pipe(map(res => res.data));
  }
}
