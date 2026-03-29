import { Component, Inject, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsistenciasService } from '@core/services/asistencias.service';
import { RegistroAsistencia, EstadoActual, EstadoTipo } from '@core/models/estado.model';
import { DateTime } from 'luxon';

@Component({
  selector: 'app-detalle-asistencia-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <header class="dialog-header">
        <div class="user-info">
          <div class="avatar-large">{{ data.usuario_nombre.slice(0, 2).toUpperCase() }}</div>
          <div class="meta">
            <h2>{{ data.usuario_nombre }}</h2>
            <p>{{ data.grupo_nombre }} • Historial Reciente</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-divider></mat-divider>

      <div class="dialog-content">
        @if (isLoading()) {
          <div class="loading-state">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Obteniendo registros...</p>
          </div>
        } @else {
          <div class="stats-summary">
            <div class="stat-card">
              <span class="label">Estado Actual</span>
              <span class="value badge" [class]="'badge-' + getColorEstado(data.estado)">
                {{ getLabel(data.estado) }}
              </span>
            </div>
            <div class="stat-card">
              <span class="label">Tiempo en Turno (Hoy)</span>
              <span class="value highlight">{{ tiempoTotal() }}</span>
            </div>
          </div>

          <div class="table-wrapper">
            <table mat-table [dataSource]="historial()">
              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let row">{{ formatFecha(row.hora_inicio) }}</td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">
                  <span class="status-badge" [class]="'badge-' + getColorEstado(row.estado)">
                    {{ getLabel(row.estado) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="inicio">
                <th mat-header-cell *matHeaderCellDef>Inicio</th>
                <td mat-cell *matCellDef="let row">{{ formatHora(row.hora_inicio) }}</td>
              </ng-container>

              <ng-container matColumnDef="fin">
                <th mat-header-cell *matHeaderCellDef>Fin</th>
                <td mat-cell *matCellDef="let row">{{ formatHora(row.hora_fin) }}</td>
              </ng-container>

              <ng-container matColumnDef="duracion">
                <th mat-header-cell *matHeaderCellDef>Duración</th>
                <td mat-cell *matCellDef="let row" class="dur-cell">
                  {{ formatDuracion(row.duracion) }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns" [class.active-row]="!row.hora_fin"></tr>
            </table>

            @if (historial().length === 0) {
              <div class="empty-state">
                <mat-icon>event_busy</mat-icon>
                <p>No se encontraron registros de asistencia.</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 0; display: flex; flex-direction: column; }
    .dialog-header {
      padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;
      .user-info {
        display: flex; align-items: center; gap: 16px;
        .avatar-large { width: 48px; height: 48px; background: var(--primary-color); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; }
        .meta {
          h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
          p { margin: 0; font-size: 13px; color: #64748b; font-weight: 500; }
        }
      }
    }
    .dialog-content { padding: 24px; }
    .stats-summary {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;
      .stat-card {
        background: #f8fafc; padding: 16px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px;
        .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
        .value { font-size: 15px; font-weight: 700; color: #1e293b; }
        .highlight { color: var(--primary-color); font-size: 20px; }
      }
    }
    .table-wrapper {
      max-height: 400px; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 12px;
      table { width: 100%; border-spacing: 0; }
      th { background: #f8fafc; padding: 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
      td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
      .dur-cell { font-weight: 600; color: #334155; }
      .active-row td { background: rgba(var(--primary-rgb), 0.02); font-weight: 600; }
    }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #94a3b8; gap: 12px; mat-icon { font-size: 32px; width: 32px; height: 32px; } }
    .badge-success { color: #2e7d32; }
    .badge-warning { color: #ef6c00; }
    .badge-info { color: #1565c0; }
    .badge-default { color: #616161; }
    .status-badge {
      padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;
      &-badge-success { background: #e8f5e9; color: #2e7d32; }
      &-badge-warning { background: #fff3e0; color: #ef6c00; }
      &-badge-info { background: #e3f2fd; color: #1565c0; }
      &-badge-default { background: #eeeeee; color: #616161; }
    }
  `]
})
export class DetalleAsistenciaDialogComponent implements OnInit {
  private asistenciasService = inject(AsistenciasService);
  private dialogRef = inject(MatDialogRef<DetalleAsistenciaDialogComponent>);
  
  isLoading = signal(true);
  historial = signal<RegistroAsistencia[]>([]);
  tiempoTotal = signal('0h 0m');
  columns = ['fecha', 'estado', 'inicio', 'fin', 'duracion'];

  constructor(@Inject(MAT_DIALOG_DATA) public data: EstadoActual) {}

  ngOnInit(): void {
    const hoy = DateTime.now().toFormat('yyyy-MM-dd');
    
    // Cargar historial detallado sin filtrar por fecha estricta para evitar desfases de zona horaria
    // Solicitamos los últimos 50 registros del usuario
    this.asistenciasService.getHistorial({
      usuario_id: this.data.usuario_id,
      limit: 50 // Usamos el nuevo parámetro de límite
    } as any).subscribe({
      next: (res) => {
        // Filtrar opcionalmente por hoy en el cliente si es necesario, 
        // pero mejor mostrar los últimos para que sea útil siempre.
        this.historial.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // Cargar tiempo total de la jornada actual
    this.asistenciasService.getTiempoTotal(this.data.usuario_id, hoy).subscribe({
      next: (res) => {
        const value = res.texto || `${res.horas}h ${res.minutos}m`;
        this.tiempoTotal.set(value);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  getLabel(tipo: EstadoTipo): string {
    const labels: any = {
      'disponible': 'Disponible',
      'descanso': 'Descanso',
      'en_bano': 'En baño',
      'fuera_de_turno': 'Fuera de turno'
    };
    return labels[tipo] || tipo;
  }

  getColorEstado(estado: string): string {
    switch (estado) {
      case 'disponible': return 'success';
      case 'descanso': return 'warning';
      case 'en_bano': return 'info';
      case 'fuera_de_turno': return 'default';
      default: return 'primary';
    }
  }

  formatFecha(isoString: string): string {
    return DateTime.fromISO(isoString).setLocale('es').toFormat('dd MMM');
  }

  formatHora(isoString: string | null): string {
    if (!isoString) return '-';
    return DateTime.fromISO(isoString).setLocale('es').toFormat('HH:mm');
  }

  formatDuracion(duracion: any): string {
    if (!duracion) return 'En curso...'; // Cambio de "Iniciando" a "En curso" para mejor claridad
    if (duracion.texto) return duracion.texto;
    if (typeof duracion === 'string') return duracion;
    if (typeof duracion === 'object') {
      const h = duracion.horas ?? 0;
      const m = duracion.minutos ?? 0;
      const s = duracion.segundos ?? 0;
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    }
    return String(duracion);
  }
}
