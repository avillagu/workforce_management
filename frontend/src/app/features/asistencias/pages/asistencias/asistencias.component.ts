import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { AsistenciasService } from '@core/services/asistencias.service';
import { AsistenciasSocketService } from '@core/services/asistencias-socket.service';
import { AuthService } from '@core/services/auth.service';
import { GrupoService } from '@core/services/grupo.service';
import { TurnosService } from '@core/services/turnos.service'; // Nuevo import
import { RegistroAsistencia, EstadoTipo, EstadoActual } from '@core/models/estado.model';
import { Grupo } from '@core/models/operacion.models';
import { DateTime } from 'luxon';
import { Subject, takeUntil, interval, startWith } from 'rxjs';
import { ExportarAsistenciasDialogComponent } from '../../dialogs/exportar-asistencias-dialog/exportar-asistencias-dialog.component';
import { DetalleAsistenciaDialogComponent } from '../../dialogs/detalle-asistencia-dialog/detalle-asistencia-dialog.component';

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    MatTooltipModule,
    MatMenuModule
  ],
  templateUrl: './asistencias.component.html',
  styleUrls: ['./asistencias.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsistenciasComponent implements OnInit, OnDestroy {
  private asistenciasService = inject(AsistenciasService);
  private turnosService = inject(TurnosService);
  private authService = inject(AuthService);
  private socketService = inject(AsistenciasSocketService);
  private grupoService = inject(GrupoService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  readonly ESTADOS = [
    { tipo: 'disponible' as EstadoTipo, label: 'Disponible', icon: 'check_circle', color: 'success' },
    { tipo: 'descanso' as EstadoTipo, label: 'Descanso', icon: 'coffee', color: 'warning' },
    { tipo: 'en_bano' as EstadoTipo, label: 'En baño', icon: 'wc', color: 'info' },
    { tipo: 'fuera_de_turno' as EstadoTipo, label: 'Fuera de turno', icon: 'logout', color: 'default' }
  ];

  // Role info
  isAdmin = computed(() => this.authService.userRole() === 'admin');
  isSupervisor = computed(() => this.authService.userRole() === 'supervisor');
  isEmpleado = computed(() => this.authService.userRole() === 'empleado');
  
  // States - Common
  isLoading = signal(false);
  
  // States - Employee View
  estadoActual = signal<EstadoTipo | null>(null);
  turnoHoyEmpleado = signal<string>('No prog.'); // Nuevo signal
  historial = signal<RegistroAsistencia[]>([]);
  tiempoTotal = signal<string>('0h 0m');
  displayedColumnsHistorial: string[] = ['estado', 'hora_inicio', 'hora_fin', 'duracion'];

  // States - Admin/Supervisor Monitor View
  empleados = signal<EstadoActual[]>([]);
  grupos = signal<Grupo[]>([]);
  selectedGrupoId = signal<string>('');
  displayedColumnsMonitor: string[] = ['empleado', 'grupo', 'estado', 'hora_inicio', 'tiempo_en_estado', 'turno_hoy']; // Reemplazado total_dia por turno_hoy
  updatingIds = signal<Set<string>>(new Set());

  // Computed for filtering
  filteredMonitoreo = computed(() => {
    const list = this.empleados();
    return [...list].sort((a, b) => {
      if (a.estado === 'disponible' && b.estado !== 'disponible') return -1;
      if (a.estado !== 'disponible' && b.estado === 'disponible') return 1;
      return a.usuario_nombre.localeCompare(b.usuario_nombre);
    });
  });

  ngOnInit(): void {
    if (this.isEmpleado()) {
      this.cargarDatosEmpleado();
    }
    
    if (this.isAdmin() || this.isSupervisor()) {
      this.cargarDatosAdministrativos();
      this.socketService.connect();
      this.socketService.onEstadoActualizado()
        .pipe(takeUntil(this.destroy$))
        .subscribe(evento => this.actualizarEmpleadoEnMonitor(evento));
    }

    // Common refreshing interval
    interval(60000)
      .pipe(startWith(0), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isEmpleado()) this.cargarDatosEmpleado();
        if (this.isAdmin() || this.isSupervisor()) this.recalcularTiemposMonitoreo();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.isAdmin() || this.isSupervisor()) {
      this.socketService.disconnect();
    }
  }

  // --- Employee Logic ---
  cargarDatosEmpleado(): void {
    this.cargarHistorial();
    this.cargarTiempoTotalIndividual();
    this.cargarTurnoHoy(); // Nueva llamada
  }

  private cargarTurnoHoy(): void {
    const userId = this.authService.user()?.id;
    if (!userId) return;
    const hoy = DateTime.now().toISODate() || '';
    
    this.turnosService.getTurnos(hoy, hoy).subscribe({
      next: (turnos) => {
        const t = turnos.find(x => x.usuario_id === userId);
        if (t) {
          const s = DateTime.fromISO(t.hora_inicio, { zone: 'utc' }).toFormat('HH:mm');
          const e = DateTime.fromISO(t.hora_fin, { zone: 'utc' }).toFormat('HH:mm');
          let label = `${s} - ${e}`;
          if (t.tipo && t.tipo !== 'turno') label = t.tipo.toUpperCase();
          this.turnoHoyEmpleado.set(label);
        } else {
          this.turnoHoyEmpleado.set('No prog.');
        }
      }
    });
  }

  marcarEstado(tipo: EstadoTipo): void {
    if (this.isLoading() || this.estadoActual() === tipo) return;
    this.isLoading.set(true);
    this.asistenciasService.marcarEstado(tipo).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.estadoActual.set(tipo);
        this.snackBar.open(`Estado "${this.getLabel(tipo)}" marcado exitosamente`, 'Cerrar', { duration: 3000 });
        this.cargarDatosEmpleado();
      },
      error: (err) => {
        this.snackBar.open(err.error?.details || 'Error al marcar estado', 'Cerrar', { duration: 5000 });
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  private cargarHistorial(): void {
    this.asistenciasService.getMisEstados().subscribe({
      next: (data) => {
        const sorted = [...data].sort((a, b) => 
          DateTime.fromISO(b.hora_inicio).toMillis() - DateTime.fromISO(a.hora_inicio).toMillis()
        );
        this.historial.set(sorted);
        const active = sorted.find(r => r.hora_fin === null);
        this.estadoActual.set(active ? active.estado : null);
      }
    });
  }

  private cargarTiempoTotalIndividual(): void {
    const userId = this.authService.user()?.id;
    if (!userId) return;
    const hoy = DateTime.now().toFormat('yyyy-MM-dd');
    this.asistenciasService.getTiempoTotal(userId, hoy).subscribe({
      next: (data) => {
        const val = data.texto || `${data.horas}h ${data.minutos}m`;
        this.tiempoTotal.set(val);
      }
    });
  }

  // --- Admin/Monitor Logic ---
  cargarDatosAdministrativos(): void {
    this.grupoService.getAll().subscribe(res => this.grupos.set(res.data));
    this.cargarEstadosMonitor();
  }

  cargarEstadosMonitor(): void {
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
    this.cargarEstadosMonitor();
  }

  getSelectedGrupoName(): string {
    const id = this.selectedGrupoId();
    if (!id) return 'Todos los Grupos';
    return this.grupos().find(g => g.id === id)?.nombre || 'Cargando...';
  }

  actualizarEmpleadoEnMonitor(evento: any): void {
    const lista = this.empleados();
    const index = lista.findIndex(e => e.usuario_id === evento.usuario_id);
    
    if (index !== -1) {
      const actualizados = [...lista];
      actualizados[index] = {
        ...actualizados[index],
        estado: evento.estado,
        hora_inicio: evento.hora_inicio,
        tiempo_en_estado: '0m'
      };
      this.empleados.set(actualizados);
      this.triggerFlash(evento.usuario_id);
    } else if (!this.selectedGrupoId() || evento.grupo_id === this.selectedGrupoId()) {
      this.cargarEstadosMonitor();
    }
  }

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

  recalcularTiemposMonitoreo(): void {
    const ahora = DateTime.utc();
    const actualizados = this.empleados().map(emp => {
      const inicio = DateTime.fromISO(emp.hora_inicio);
      const diff = ahora.diff(inicio, ['hours', 'minutes', 'seconds']);
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
    this.dialog.open(ExportarAsistenciasDialogComponent, { width: '500px', disableClose: true });
  }

  verDetalleEmpleado(row: EstadoActual): void {
    const dialogRef = this.dialog.open(DetalleAsistenciaDialogComponent, {
      width: '600px',
      data: row,
      disableClose: false
    });
  }

  // --- Helpers ---
  getLabel(tipo: EstadoTipo): string {
    return this.ESTADOS.find(e => e.tipo === tipo)?.label || tipo;
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

  formatHora(isoString: string | null): string {
    if (!isoString) return '-';
    return DateTime.fromISO(isoString).setLocale('es').toFormat('HH:mm');
  }

  formatDuracion(duracion: any): string {
    if (!duracion) return 'En curso...';
    
    // Si el backend ya mandó el texto formateado
    if (duracion.texto) return duracion.texto;
    
    if (typeof duracion === 'string') return duracion;
    
    if (typeof duracion === 'object') {
      const h = duracion.horas ?? duracion.hours ?? 0;
      const m = duracion.minutos ?? duracion.minutes ?? 0;
      const s = duracion.segundos ?? duracion.seconds ?? 0;
      
      const parts = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      if (h === 0 && m === 0) parts.push(`${s}s`);
      
      const res = parts.join(' ') || '0s';
      return res === '0s' ? 'Iniciando...' : res;
    }
    
    return String(duracion);
  }
}
