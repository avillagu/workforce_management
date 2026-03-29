import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsistenciasService } from '@core/services/asistencias.service';
import { AsistenciasSocketService } from '@core/services/asistencias-socket.service';
import { GrupoService } from '@core/services/grupo.service';
import { EstadoActual, EstadoTipo } from '@core/models/estado.model';
import { Grupo } from '@core/models/operacion.models';
import { Subject, takeUntil, interval } from 'rxjs';
import { DateTime } from 'luxon';
import { ExportarAsistenciasDialogComponent } from '../../dialogs/exportar-asistencias-dialog/exportar-asistencias-dialog.component';

@Component({
  selector: 'app-monitoreo-asistencias',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatDividerModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './monitoreo-asistencias.component.html',
  styleUrls: ['./monitoreo-asistencias.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitoreoAsistenciasComponent implements OnInit, OnDestroy {
  private asistenciasService = inject(AsistenciasService);
  private socketService = inject(AsistenciasSocketService);
  private grupoService = inject(GrupoService);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  // Signals
  empleados = signal<EstadoActual[]>([]);
  grupos = signal<Grupo[]>([]);
  selectedGrupoId = signal<string>('');
  isLoading = signal(false);
  
  // Computed for filtering (local fallback if needed, but we refetch)
  filteredEmpleados = computed(() => {
    const list = this.empleados();
    // Sorting: Disponible first, then alphabetical
    return [...list].sort((a, b) => {
      if (a.estado === 'disponible' && b.estado !== 'disponible') return -1;
      if (a.estado !== 'disponible' && b.estado === 'disponible') return 1;
      return a.nombre.localeCompare(b.nombre);
    });
  });

  displayedColumns: string[] = ['empleado', 'grupo', 'estado', 'hora_inicio', 'tiempo_en_estado', 'total_dia'];

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarEstados();
    this.socketService.connect();
    
    this.socketService.onEstadoActualizado()
      .pipe(takeUntil(this.destroy$))
      .subscribe(evento => {
        this.actualizarEmpleadoEnTabla(evento);
      });

    // Update "time in state" every minute
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // We could just trigger a change detection or recalculate locally
        // For simplicity and accuracy after some time, let's just trigger a local update
        this.recalcularTiemposLocales();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.socketService.disconnect();
  }

  cargarGrupos(): void {
    this.grupoService.getAll().subscribe({
      next: (res) => this.grupos.set(res.data)
    });
  }

  cargarEstados(): void {
    this.isLoading.set(true);
    this.asistenciasService.getEstadoActual(this.selectedGrupoId() || undefined)
      .subscribe({
        next: (data) => {
          this.empleados.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
  }

  onGrupoChange(grupoId: string): void {
    this.selectedGrupoId.set(grupoId);
    this.cargarEstados();
  }

  actualizarEmpleadoEnTabla(evento: any): void {
    const lista = this.empleados();
    const index = lista.findIndex(e => e.usuario_id === evento.usuario_id);
    
    if (index !== -1) {
      const actualizados = [...lista];
      actualizados[index] = {
        ...actualizados[index],
        estado: evento.estado,
        hora_inicio: evento.hora_inicio,
        // We'll let the next interval recalculate the "tiempo_en_estado" or do it now
        tiempo_en_estado: '0m'
      };
      this.empleados.set(actualizados);
      
      // Trigger a visual flash (handled in CSS with [class.updated])
      this.triggerFlash(evento.usuario_id);
    } else if (!this.selectedGrupoId() || evento.grupo_id === this.selectedGrupoId()) {
      // If it's a new employee that should be in this view, refetch 
      this.cargarEstados();
    }
  }

  private updatingIds = signal<Set<string>>(new Set());

  triggerFlash(id: string): void {
    const set = new Set(this.updatingIds());
    set.add(id);
    this.updatingIds.set(set);
    
    setTimeout(() => {
      const newSet = new Set(this.updatingIds());
      newSet.delete(id);
      this.updatingIds.set(newSet);
    }, 2000);
  }

  isUpdating(id: string): boolean {
    return this.updatingIds().has(id);
  }

  recalcularTiemposLocales(): void {
    const ahora = DateTime.utc();
    const actualizados = this.empleados().map(emp => {
      const inicio = DateTime.fromISO(emp.hora_inicio);
      const diff = ahora.diff(inicio, ['hours', 'minutes']);
      const hours = Math.floor(diff.hours);
      const minutes = Math.floor(diff.minutes);
      
      return {
        ...emp,
        tiempo_en_estado: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        alerta: emp.estado === 'descanso' && diff.as('minutes') > 30
      };
    });
    this.empleados.set(actualizados);
  }

  abrirExportar(): void {
    this.dialog.open(ExportarAsistenciasDialogComponent, {
      width: '500px',
      disableClose: true
    });
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

  getLabelEstado(estado: string): string {
    const labels: any = {
      'disponible': 'Disponible',
      'descanso': 'Descanso',
      'en_bano': 'En baño',
      'fuera_de_turno': 'Fuera de turno'
    };
    return labels[estado] || estado;
  }
}
