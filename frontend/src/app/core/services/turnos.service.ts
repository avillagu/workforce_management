import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  Turno,
  TurnoPayload,
  ProgramacionMasivaDto,
  ProgramacionMasivaResponse
} from '@core/models/turno.model';

type ApiResponse<T> = { success: boolean; data: T; error?: string; details?: string };

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/turnos`;

  getTurnos(fechaInicio: string, fechaFin: string): Observable<Turno[]> {
    const url = `${this.baseUrl}?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
    return this.http.get<ApiResponse<Turno[]> | Turno[]>(url).pipe(
      map((resp) => (Array.isArray(resp) ? resp : resp.data ?? []))
    );
  }

  crearTurno(payload: TurnoPayload): Observable<Turno> {
    return this.http
      .post<ApiResponse<Turno> | Turno>(this.baseUrl, payload)
      .pipe(map((resp: any) => (resp.data ? resp.data : resp)));
  }

  actualizarTurno(id: string, payload: TurnoPayload): Observable<Turno> {
    return this.http
      .put<ApiResponse<Turno> | Turno>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((resp: any) => (resp.data ? resp.data : resp)));
  }

  eliminarTurno(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void> | void>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  programacionMasiva(dto: ProgramacionMasivaDto): Observable<ProgramacionMasivaResponse> {
    return this.http.post<ProgramacionMasivaResponse>(`${this.baseUrl}/masivo`, dto);
  }

  eliminarTurnosMasivo(dto: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/masivo-eliminar`, dto);
  }

  moverTurno(id: string, destino_usuario_id: string, destino_fecha: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/mover`, { id, destino_usuario_id, destino_fecha });
  }

  publicarTurnos(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/publicar`, { fecha_inicio: fechaInicio, fecha_fin: fechaFin });
  }
}
