import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/operacion.models';
import { PreajusteTurno } from '../models/preajuste.model';

@Injectable({
  providedIn: 'root'
})
export class PreajustesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/preajustes`;

  getAll(): Observable<PreajusteTurno[]> {
    return this.http.get<ApiResponse<PreajusteTurno[]> | PreajusteTurno[]>(this.baseUrl).pipe(
      map(resp => Array.isArray(resp) ? resp : resp.data ?? [])
    );
  }

  create(data: Partial<PreajusteTurno>): Observable<PreajusteTurno> {
    return this.http.post<ApiResponse<PreajusteTurno> | PreajusteTurno>(this.baseUrl, data).pipe(
      map(resp => (resp as any).data ?? resp)
    );
  }

  update(id: string, data: Partial<PreajusteTurno>): Observable<PreajusteTurno> {
    return this.http.put<ApiResponse<PreajusteTurno> | PreajusteTurno>(`${this.baseUrl}/${id}`, data).pipe(
      map(resp => (resp as any).data ?? resp)
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
