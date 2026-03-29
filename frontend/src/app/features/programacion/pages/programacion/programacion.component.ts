import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { DateTime } from 'luxon';
import { Empleado, Grupo } from '@core/models/operacion.models';
import { Turno, TurnoSocketEvento } from '@core/models/turno.model';
import { EmpleadoService } from '@core/services/empleado.service';
import { TurnosService } from '@core/services/turnos.service';
import { AuthService } from '@core/services/auth.service';
import { GrupoService } from '@core/services/grupo.service';
import { TurnosSocketService } from '@core/services/turnos-socket.service';
import { ExcelService } from '@core/services/excel.service';
import { MatSelectModule } from '@angular/material/select';
import { ProgramarTurnoDialogComponent } from '../../dialogs/programar-turno-dialog.component';
import { ProgramarMasivoDialogComponent } from '../../dialogs/programar-masivo-dialog.component';
import { VerTurnoDialogComponent } from '../../dialogs/ver-turno-dialog.component';
import { ProgramarTurnosDialogComponent } from '../../dialogs/programar-turnos-dialog.component';
import { EliminarTurnosDialogComponent } from '../../dialogs/eliminar-turnos-dialog.component';
import { SolicitarCambioDialogComponent } from '../../dialogs/solicitar-cambio-dialog.component';
import { ExportarProgramacionDialogComponent } from '../../dialogs/exportar-programacion-dialog.component';
import { SmartSchedulingDialogComponent } from '../../dialogs/smart-scheduling-dialog/smart-scheduling-dialog.component';
import { ConsolidadoComponent } from '../../components/consolidado/consolidado.component';
import { TipoTurno } from '@core/models/turno.model';

type VistaCalendario = 'week';

interface DiaCalendario {
  date: DateTime;
  label: string;
  isToday: boolean;
  isWeekend: boolean;
}

@Component({
  selector: 'app-programacion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule,
    MatInputModule,
    MatSelectModule,
    ScrollingModule,
    DragDropModule,
    ProgramarTurnosDialogComponent,
    EliminarTurnosDialogComponent,
    SolicitarCambioDialogComponent,
    ExportarProgramacionDialogComponent,
    SmartSchedulingDialogComponent,
    ConsolidadoComponent
  ],
  templateUrl: './programacion.component.html',
  styleUrls: ['./programacion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramacionComponent implements OnInit, OnDestroy {
  private readonly empleadoService = inject(EmpleadoService);
  private readonly turnosService = inject(TurnosService);
  private readonly authService = inject(AuthService);
  private readonly grupoService = inject(GrupoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly turnosSocket = inject(TurnosSocketService);
  private readonly excelService = inject(ExcelService);

  readonly viewMode = signal<VistaCalendario>('week');
  readonly anchorDate = signal(DateTime.now());
  readonly empleados = signal<Empleado[]>([]);
  readonly grupos = signal<Grupo[]>([]);
  readonly selectedGrupoId = signal<string>('');
  readonly turnos = signal<Turno[]>([]);
  readonly loadingEmpleados = signal<boolean>(false);
  readonly loadingTurnos = signal(false);
  private monthDataLoaded = false;
  private currentMonthStr = '';

  private socketCleanup?: () => void;

  readonly isAdmin = computed(() => this.authService.user()?.rol === 'admin');
  readonly isSupervisor = computed(() => this.authService.user()?.rol === 'supervisor');
  readonly isEmpleado = computed(() => this.authService.user()?.rol === 'empleado');
  readonly currentUserId = computed(() => this.authService.user()?.id);

  readonly filteredEmpleados = computed(() => {
    const list = this.empleados();
    const grupoId = this.selectedGrupoId();
    if (!grupoId) return list;
    return list.filter(e => e.grupo_id === grupoId);
  });

  readonly range = computed(() => {
    const anchor = this.anchorDate();
    const start = anchor.startOf('week');
    return { start, end: start.plus({ days: 6 }) };
  });

  readonly days = computed<DiaCalendario[]>(() => {
    const { start, end } = this.range();
    const items: DiaCalendario[] = [];
    let cursor = start.startOf('day');
    while (cursor <= end.endOf('day')) {
      items.push({
        date: cursor,
        label: cursor.setLocale('es').toFormat('EEE d'),
        isToday: cursor.hasSame(DateTime.now(), 'day'),
        isWeekend: cursor.weekday === 6 || cursor.weekday === 7
      });
      cursor = cursor.plus({ days: 1 });
    }
    return items;
  });

  readonly rangeLabel = computed(() => {
    const { start, end } = this.range();
    const s = start.setLocale('es');
    const e = end.setLocale('es');
    if (s.month !== e.month) {
      return `${s.toFormat('dd LLL')} — ${e.toFormat('dd LLL')}`;
    }
    return `${s.toFormat('dd')} — ${e.toFormat('dd LLL')}`;
  });

  ngOnInit(): void {
    this.loadEmpleados();
    this.loadTurnos();
    this.loadGrupos();
    this.turnosSocket.connect();
    this.socketCleanup = this.turnosSocket.onTurnosActualizado((evento) =>
      this.handleSocketEvento(evento)
    );
  }

  ngOnDestroy(): void {
    this.socketCleanup?.();
    this.turnosSocket.disconnect();
  }

  goToday(): void {
    this.anchorDate.set(DateTime.now());
    this.loadTurnos();
  }

  goPrev(): void {
    this.anchorDate.update((current) => current.minus({ weeks: 1 }));
    this.loadTurnos();
  }

  goNext(): void {
    this.anchorDate.update((current) => current.plus({ weeks: 1 }));
    this.loadTurnos();
  }

  onDateChange(date: Date | null): void {
    if (date) {
      this.anchorDate.set(DateTime.fromJSDate(date) as any);
      if (this.monthDataLoaded) {
        this.loadMesActual();
      } else {
        this.loadTurnos();
      }
    }
  }

  onMonthSelected(date: Date | null, picker: any): void {
    if (date) {
      this.anchorDate.set(DateTime.fromJSDate(date) as any);
      if (this.monthDataLoaded) {
        this.loadMesActual();
      }
      picker.close();
    }
  }

  onDrop(event: CdkDragDrop<any>): void {
    if (!this.isAdmin()) return;
    const turno = event.item.data as Turno;
    const target = event.container.data as { empId: string; date: string };

    if (turno.usuario_id === target.empId && 
        DateTime.fromISO(turno.hora_inicio).toISODate() === target.date) {
      return;
    }

    this.turnosService.moverTurno(turno.id, target.empId, target.date).subscribe({
      next: () => this.snackBar.open('Movimiento exitoso', 'Cerrar', { duration: 2000 }),
      error: (err) => {
        const msg = err.status === 409 ? 'Existe un conflicto en el horario destino' : 'Error al mover turno';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
      }
    });
  }

  trackEmpleado = (_: number, emp: Empleado) => emp.id;
  trackDia = (_: number, dia: DiaCalendario) => dia.date.toISODate();
  trackTurno = (_: number, turno: Turno) => turno.id;

  getTurnosFor(empleadoId: string, dia: DateTime): Turno[] {
    const raw = this.turnos().filter((t) =>
      t.usuario_id === empleadoId &&
      DateTime.fromISO(t.hora_inicio, { zone: 'utc' }).hasSame(dia, 'day')
    );
    
    // Si no es admin, solo ver publicados
    if (!this.isAdmin()) {
      return raw.filter(t => t.publicado);
    }
    return raw;
  }

  publicarTurnos(): void {
    if (!this.isAdmin()) return;
    
    this.turnosService.publicarTurnos('', '').subscribe({
      next: (resp) => {
        const publicados = resp.data?.publicados || 0;
        this.snackBar.open(`${publicados} turnos de todo el mes publicados correctamente`, 'Cerrar', { duration: 3000 });
      },
      error: () => this.snackBar.open('Error al publicar turnos', 'Cerrar', { duration: 4000 })
    });
  }

  onCambioTurno(): void {
    this.dialog.open(SolicitarCambioDialogComponent, {
      width: '500px',
      autoFocus: false
    });
  }

  onTabChange(index: number): void {
    if (index === 1) {
       // Solo cargar si no se ha cargado este mes o si cambió el mes
       const targetMonth = this.anchorDate().toFormat('yyyy-MM');
       if (!this.monthDataLoaded || this.currentMonthStr !== targetMonth) {
          this.loadMesActual();
       }
    } else {
       // Solo cargar si volvimos de ver el mes entero y queremos volver a la semana
       if (this.monthDataLoaded) {
          this.monthDataLoaded = false; 
          this.loadTurnos();
       }
    }
  }

  loadMesActual(): void {
    const start = this.anchorDate().startOf('month').toISODate()!;
    const end = this.anchorDate().endOf('month').toISODate()!;
    this.currentMonthStr = this.anchorDate().toFormat('yyyy-MM');

    this.loadingTurnos.set(true);
    this.turnosService.getTurnos(start, end).subscribe({
      next: (data) => {
        this.turnos.set(data);
        this.loadingTurnos.set(false);
        this.monthDataLoaded = true;
      },
      error: () => this.loadingTurnos.set(false)
    });
  }

  onExportar(): void {
    const dialogRef = this.dialog.open(ExportarProgramacionDialogComponent, {
      width: '500px',
      data: {
        empleados: this.filteredEmpleados()
      }
    });
  }

  onEliminarTurnos(): void {
    if (!this.isAdmin()) return;

    const dialogRef = this.dialog.open(EliminarTurnosDialogComponent, {
      width: '720px',
      data: {
        empleados: this.empleados()
      }
    });

    dialogRef.afterClosed().subscribe((refresh?: boolean) => {
      if (refresh) {
        this.loadTurnos();
      }
    });
  }

  onProgramarTurnos(): void {
    const dialogRef = this.dialog.open(ProgramarTurnosDialogComponent, {
      width: '720px',
      data: {
        empleados: this.empleados()
      }
    });

    dialogRef.afterClosed().subscribe((refresh?: boolean) => {
      if (refresh) {
        this.loadTurnos();
      }
    });
  }

  onProgramacionInteligente(): void {
    if (!this.isAdmin()) return;

    const dialogRef = this.dialog.open(SmartSchedulingDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((refresh?: boolean) => {
      if (refresh) {
        this.loadTurnos();
      }
    });
  }

  getTurnoIcon(tipo?: string): string {
    switch (tipo) {
      case 'descanso': return 'bedtime_off';
      case 'permiso': return 'event_busy';
      case 'incapacidad': return 'health_and_safety';
      default: return 'schedule';
    }
  }

  getTurnoLabel(turno: Turno): string {
    if (turno.tipo && (turno.tipo as string) !== 'turno') {
      return (turno.tipo as string).toUpperCase();
    }
    return `${this.formatHora(turno.hora_inicio)} - ${this.formatHora(turno.hora_fin)}`;
  }

  openProgramarIndividual(empleadoId?: string, fecha?: DateTime): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Solo los administradores pueden programar turnos', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const dialogRef = this.dialog.open(ProgramarTurnoDialogComponent, {
      width: '520px',
      data: {
        empleados: this.empleados(),
        empleadoIdInicial: empleadoId,
        fechaInicial: fecha?.toISODate()
      }
    });

    dialogRef.afterClosed().subscribe((turno: Turno | undefined) => {
      if (turno) {
        this.upsertTurno(turno);
        this.snackBar.open('Turno creado correctamente', 'Cerrar', { duration: 2500 });
      }
    });
  }

  openProgramarMasivo(): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Solo los administradores pueden programar turnos', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const dialogRef = this.dialog.open(ProgramarMasivoDialogComponent, {
      width: '640px',
      data: {
        empleados: this.empleados()
      }
    });

    dialogRef.afterClosed().subscribe((refresh?: boolean) => {
      if (refresh) {
        this.loadTurnos();
      }
    });
  }

  openVerTurno(turno: Turno): void {
    const dialogRef = this.dialog.open(VerTurnoDialogComponent, {
      width: '520px',
      data: {
        turno,
        empleados: this.empleados(),
        isAdmin: this.isAdmin()
      }
    });

    dialogRef.afterClosed().subscribe((result?: { action: 'updated' | 'deleted'; turno?: Turno }) => {
      if (!result) return;
      if (result.action === 'deleted') {
        this.removeTurno(turno.id);
        this.snackBar.open('Turno eliminado', 'Cerrar', { duration: 2500 });
      }
      if (result.action === 'updated' && result.turno) {
        this.upsertTurno(result.turno);
        this.snackBar.open('Turno actualizado', 'Cerrar', { duration: 2500 });
      }
    });
  }

  onCellClick(empleado: Empleado, dia: DiaCalendario): void {
    if (!this.isAdmin()) return;
    this.openProgramarIndividual(empleado.id, dia.date);
  }

  private loadEmpleados(): void {
    this.loadingEmpleados.set(true);
    this.empleadoService.getAll().subscribe({
      next: (resp) => {
        const empleados = resp.data ?? [];
        this.empleados.set(empleados);
      },
      error: () => {
        this.snackBar.open('No se pudo cargar la lista de empleados', 'Cerrar', { duration: 3500 });
      },
      complete: () => this.loadingEmpleados.set(false)
    });
  }

  private loadGrupos(): void {
    this.grupoService.getAll().subscribe({
      next: (resp) => this.grupos.set(resp.data || []),
      error: () => this.snackBar.open('Error cargando grupos', 'Cerrar', { duration: 3000 })
    });
  }

  private loadTurnos(): void {
    const { start, end } = this.range();
    this.loadingTurnos.set(true);
    this.turnosService.getTurnos(start.toISODate()!, end.toISODate()!).subscribe({
      next: (turnos) => this.turnos.set(turnos),
      error: () =>
        this.snackBar.open('No se pudo cargar la programación', 'Cerrar', { duration: 3500 }),
      complete: () => this.loadingTurnos.set(false)
    });
  }

  private upsertTurno(turno: Turno): void {
    this.turnos.update((current) => {
      const exists = current.findIndex((t) => t.id === turno.id);
      if (exists >= 0) {
        const clone = [...current];
        clone[exists] = turno;
        return clone;
      }
      return [...current, turno];
    });
  }

  private removeTurno(turnoId: string): void {
    this.turnos.update((current) => current.filter((t) => t.id !== turnoId));
  }

  private handleSocketEvento(evento: TurnoSocketEvento): void {
    if (evento.accion === 'crear' && evento.turno) {
      this.upsertTurno(evento.turno);
    } else if (evento.accion === 'actualizar' && evento.turno) {
      this.upsertTurno(evento.turno);
    } else if (evento.accion === 'eliminar' && evento.turno) {
      this.removeTurno(evento.turno.id);
    } else if (evento.accion === 'masivo') {
      this.loadTurnos();
    }
  }

  private buildColorMap(empleados: Empleado[]): Record<string, string> {
    const palette = [
      '#0F9D58',
      '#1E88E5',
      '#D81B60',
      '#F4511E',
      '#5E35B1',
      '#00897B',
      '#546E7A',
      '#C0CA33',
      '#8E24AA',
      '#039BE5'
    ];
    const map: Record<string, string> = {};
    empleados.forEach((emp, idx) => {
      map[emp.id] = palette[idx % palette.length];
    });
    return map;
  }

  formatHora(horaIso: string): string {
    return DateTime.fromISO(horaIso, { zone: 'utc' }).toFormat('HH:mm');
  }

  onGrupoFilterChange(grupoId: string): void {
    this.selectedGrupoId.set(grupoId);
  }

  getSelectedGrupoName(): string {
    const id = this.selectedGrupoId();
    if (!id) return 'Todos los Grupos';
    return this.grupos().find(g => g.id === id)?.nombre || 'Grupo';
  }
}
