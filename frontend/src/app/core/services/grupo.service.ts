import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Grupo, GrupoCreate, GrupoUpdate, ApiListResponse, ApiResponse } from '@core/models/operacion.models';
import { environment } from '@env/environment';

/**
 * Service for managing Grupos (Groups)
 * Handles all CRUD operations with /api/grupos endpoint
 */
@Injectable({
  providedIn: 'root'
})
export class GrupoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/grupos`;

  /**
   * Get all groups
   */
  getAll(): Observable<ApiListResponse<Grupo>> {
    return this.http.get<ApiListResponse<Grupo>>(this.apiUrl);
  }

  /**
   * Get a single group by ID
   */
  getById(id: string): Observable<ApiResponse<Grupo>> {
    return this.http.get<ApiResponse<Grupo>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new group
   */
  create(grupo: GrupoCreate): Observable<ApiResponse<Grupo>> {
    return this.http.post<ApiResponse<Grupo>>(this.apiUrl, grupo);
  }

  /**
   * Update an existing group
   */
  update(id: string, grupo: GrupoUpdate): Observable<ApiResponse<Grupo>> {
    return this.http.put<ApiResponse<Grupo>>(`${this.apiUrl}/${id}`, grupo);
  }

  /**
   * Delete a group
   */
  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Toggle group active status
   */
  toggleActive(id: string, activo: boolean): Observable<ApiResponse<Grupo>> {
    return this.http.patch<ApiResponse<Grupo>>(`${this.apiUrl}/${id}/activo`, { activo });
  }
}
