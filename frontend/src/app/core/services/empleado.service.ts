import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empleado, EmpleadoCreate, EmpleadoUpdate, ApiListResponse, ApiResponse } from '@core/models/operacion.models';
import { environment } from '@env/environment';

/**
 * Service for managing Empleados (Employees)
 * Handles all CRUD operations with /api/usuarios/empleados endpoint
 */
@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/usuarios/empleados`;

  /**
   * Get all employees
   */
  getAll(): Observable<ApiListResponse<Empleado>> {
    return this.http.get<ApiListResponse<Empleado>>(this.apiUrl);
  }

  /**
   * Get a single employee by ID
   */
  getById(id: string): Observable<ApiResponse<Empleado>> {
    return this.http.get<ApiResponse<Empleado>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new employee
   */
  create(empleado: EmpleadoCreate): Observable<ApiResponse<Empleado>> {
    return this.http.post<ApiResponse<Empleado>>(this.apiUrl, empleado);
  }

  /**
   * Update an existing employee
   */
  update(id: string, empleado: EmpleadoUpdate): Observable<ApiResponse<Empleado>> {
    return this.http.put<ApiResponse<Empleado>>(`${this.apiUrl}/${id}`, empleado);
  }

  /**
   * Delete an employee
   */
  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Toggle employee active status
   */
  toggleActive(id: string, activo: boolean): Observable<ApiResponse<Empleado>> {
    return this.http.patch<ApiResponse<Empleado>>(`${this.apiUrl}/${id}/activo`, { activo });
  }
}
