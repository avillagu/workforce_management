import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SmartConfig {
  id?: string;
  nombre: string;
  grupo_id: string;
  configuracion: {
    empleado_ids: string[];
    turnos: Array<{ inicio: string, fin: string }>;
    cobertura_sabado: number;
    cobertura_domingo: number;
    cobertura_festivo: number;
    horas_max_dia: number;
    horas_max_semana: number;
    tipo_rotacion: 'fijo' | 'semanal';
    periodo: 'semana' | 'quincena' | 'mes';
  };
  grupo_nombre?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmartSchedulingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/smart-scheduling`;

  getConfiguraciones(): Observable<SmartConfig[]> {
    return this.http.get<{ success: true, data: SmartConfig[] }>(this.apiUrl).pipe(
      map(resp => resp.data)
    );
  }

  saveConfiguracion(config: SmartConfig): Observable<SmartConfig> {
    return this.http.post<{ success: true, data: SmartConfig }>(this.apiUrl, config).pipe(
      map(resp => resp.data)
    );
  }

  updateConfiguracion(id: string, config: Partial<SmartConfig>): Observable<SmartConfig> {
    return this.http.put<{ success: true, data: SmartConfig }>(`${this.apiUrl}/${id}`, config).pipe(
      map(resp => resp.data)
    );
  }

  deleteConfiguracion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  generarProgramacion(config: SmartConfig, fechaInicio: string): Observable<any> {
    // Este endpoint lo crearemos después para el motor
    return this.http.post(`${this.apiUrl}/generate`, { config, fecha_inicio: fechaInicio });
  }
}
