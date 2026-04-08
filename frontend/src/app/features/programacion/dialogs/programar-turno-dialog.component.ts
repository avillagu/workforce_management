import { Component, Inject, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  ValidationErrors,
  AbstractControl
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { Empleado } from '@core/models/operacion.models';
import { Turno, TurnoPayload, TipoTurno } from '@core/models/turno.model';
import { TurnosService } from '@core/services/turnos.service';

export interface ProgramarTurnoData {
  empleados: Empleado[];
  empleadoIdInicial?: string;
  fechaInicial?: string;
  turno?: Turno;
}

@Component({
  selector: 'app-programar-turno-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="premium-dialog">
      <div class="dialog-header dark-header">
        <div class="icon-badge primary-gradient-badge">
          <mat-icon>event_available</mat-icon>
        </div>
        <div class="header-info">
          <p class="eyebrow">PROGRAMACIÓN INDIVIDUAL</p>
          <h2>{{ data.turno ? 'Editar Turno' : 'Nueva Planificación' }}</h2>
          <p class="subtitle">Gestiona la agenda específica de un colaborador</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn white-icon">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="form">
          <!-- Paso 1: Selección de Empleado -->
          <section class="form-section">
            <h3 class="section-title"><mat-icon>person</mat-icon> Colaborador</h3>
            
            <div class="filter-wrapper">
              <label class="p-label">Empleado Seleccionado</label>
              <button 
                mat-flat-button 
                type="button"
                class="premium-pill-btn" 
                [matMenuTriggerFor]="empMenu"
              >
                <div class="pill-content">
                  <mat-icon class="pill-icon">person</mat-icon>
                  <span class="pill-label">{{ getSelectedEmpleadoName() }}</span>
                  <mat-icon class="pill-chevron">expand_more</mat-icon>
                </div>
              </button>

              <mat-menu #empMenu="matMenu" class="premium-selector-menu">
                <button 
                  mat-menu-item 
                  *ngFor="let emp of data.empleados" 
                  (click)="form.get('usuario_id')?.setValue(emp.id)"
                  [class.active-item]="form.get('usuario_id')?.value === emp.id"
                >
                  <mat-icon>badge</mat-icon>
                  <div class="emp-menu-item">
                    <span class="m-name">{{ emp.nombre_completo }}</span>
                    <span class="m-user">&#64;{{ emp.username }}</span>
                  </div>
                </button>
              </mat-menu>
            </div>
          </section>

          <!-- Paso 2: Fecha y Tipo -->
          <section class="form-section">
            <h3 class="section-title"><mat-icon>category</mat-icon> Tipo y Fecha</h3>
            
            <div class="custom-type-selector">
              <div *ngFor="let t of [
                {v:'turno', l:'Turno', i:'schedule'}, 
                {v:'descanso', l:'Descanso', i:'bedtime'}, 
                {v:'permiso', l:'Permiso', i:'event_busy'}, 
                {v:'incapacidad', l:'Incapacidad', i:'health_and_safety'}
              ]"
                class="type-option"
                [class.active]="form.get('tipo')?.value === t.v"
                (click)="setTipo(t.v)">
                <mat-icon *ngIf="form.get('tipo')?.value === t.v" class="mini-icon">{{ t.i }}</mat-icon>
                {{ t.l }}
              </div>
            </div>

            <div class="range-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Fecha de programación</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="fecha" (dateChange)="onDateChange()">
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
                <mat-error>La fecha es obligatoria</mat-error>
              </mat-form-field>
            </div>

            <!-- Opción Compensatorio (Solo si es Descanso) -->
            <div class="compensatorio-toggle-section animated-fade" *ngIf="form.get('tipo')?.value === 'descanso'">
              <div class="toggle-card" [class.active]="form.get('es_compensatorio')?.value" (click)="toggleCompensatorio()">
                <div class="toggle-info">
                  <span class="t-label">¿Es descanso compensatorio?</span>
                  <span class="t-hint">Se restará del acumulado de domingos trabajados</span>
                </div>
                <div class="toggle-action">
                  <mat-icon>{{ form.get('es_compensatorio')?.value ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                </div>
              </div>
            </div>
          </section>

          <!-- Paso 3: Horario (Solo si es tipo turno) -->
          <section class="form-section animated-fade" *ngIf="form.get('tipo')?.value === 'turno'">
            <h3 class="section-title"><mat-icon>history</mat-icon> Horario Programado</h3>
            <div class="time-grid-individual">
              <mat-form-field appearance="outline">
                <mat-label>Hora Inicio</mat-label>
                <input matInput type="time" formControlName="hora_inicio">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hora Fin</mat-label>
                <input matInput type="time" formControlName="hora_fin">
                <mat-error *ngIf="form.hasError('horaInvalida')">El fin debe ser posterior</mat-error>
              </mat-form-field>
            </div>

            <div class="presets-container">
              <p class="label-hint">Preajustes rápidos:</p>
              <div class="preset-chips">
                <div *ngFor="let p of presets" class="preset-chip" (click)="applyPreset(p)">
                  {{ p.label }}
                </div>
              </div>
            </div>
          </section>
        </form>
      </mat-dialog-content>

      <div class="dialog-actions">
        <div class="spacer"></div>
        <div class="button-group">
          <button mat-button (click)="dialogRef.close()" class="cancel-btn">Cancelar</button>
          <button mat-flat-button 
                  class="submit-btn"
                  [disabled]="form.invalid || saving()"
                  (click)="onSubmit()">
            <mat-icon>{{ data.turno ? 'sync' : 'bolt' }}</mat-icon>
            {{ saving() ? 'Guardando...' : (data.turno ? 'Actualizar Turno' : 'Programar Turno') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .premium-dialog {
      --primary: #2563eb;
      --bg-light: #f8fafc;
      --border: #e2e8f0;
      padding: 0;
      overflow: hidden;
    }

    .dark-header {
      padding: 20px 24px;
      background: #1e293b;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
    }

    .primary-gradient-badge {
      background: linear-gradient(135deg, #3b82f6, #60a5fa);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .header-info h2 { margin: 0; font-size: 20px; font-weight: 800; color: white; }
    .eyebrow { text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #3b82f6; margin: 0; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #94a3b8; }
    .white-icon { color: white !important; }

    .dialog-content { padding: 24px; background: var(--bg-light); max-height: 60vh; overflow-y: auto; }

    .form-section {
      background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px;
      border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .section-title {
      font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;
      display: flex; align-items: center; gap: 8px;
    }
    .section-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }

    .emp-option { display: flex; flex-direction: column; }
    .emp-name { font-weight: 600; color: #1e293b; }
    .emp-user { font-size: 11px; color: #64748b; }

    .emp-menu-item { display: flex; flex-direction: column; line-height: 1.2; }
    .m-name { font-weight: 600; font-size: 14px; }
    .m-user { font-size: 11px; color: #64748b; }

    .filter-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .p-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-left: 4px;
      }
    }

    .premium-pill-btn {
      height: 52px !important;
      background: white !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 14px !important;
      padding: 0 16px !important;
      width: 100%;
      text-align: left;
      
      .pill-content {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .pill-icon { color: #3b82f6; font-size: 20px; width: 20px; height: 20px; }
        .pill-label { flex: 1; font-size: 14px; font-weight: 600; color: #1e293b; }
        .pill-chevron { color: #94a3b8; font-size: 20px; width: 20px; height: 20px; }
      }

      &:hover {
        border-color: #3b82f6 !important;
        background: #f8fafc !important;
      }
    }

    ::ng-deep .premium-selector-menu {
      border-radius: 14px !important;
      margin-top: 8px !important;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
      min-width: 240px !important;

      .mat-mdc-menu-item {
        height: auto !important;
        padding-top: 10px !important;
        padding-bottom: 10px !important;
        border-bottom: 1px solid #f1f5f9;

        mat-icon { color: #94a3b8; }

        &.active-item {
          background: #eff6ff !important;
          color: #2563eb !important;
          mat-icon { color: #3b82f6; }
        }
      }
    }

    /* TYPE SELECTOR */
    .custom-type-selector {
      display: flex; background: #f1f5f9; padding: 4px; border-radius: 14px; gap: 4px; margin-bottom: 20px;
    }

    .type-option {
      flex: 1; height: 40px; display: flex; align-items: center; justify-content: center;
      border-radius: 11px; color: #64748b; font-weight: 700; font-size: 12px;
      cursor: pointer; transition: all 0.2s ease; user-select: none; gap: 6px;
    }

    .type-option.active { background: white; color: #2563eb; box-shadow: 0 4px 10px rgba(0,0,0,0.06); }
    .mini-icon { font-size: 16px; width: 16px; height: 16px; }

    .time-grid-individual { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-width { width: 100%; }

    /* PRESETS */
    .presets-container { margin-top: 16px; border-top: 1px dashed #e2e8f0; padding-top: 16px; }
    .label-hint { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
    .preset-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .preset-chip {
      padding: 6px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px;
      font-size: 11px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s;
    }
    .preset-chip:hover { background: #eff6ff; border-color: #3b82f6; color: #2563eb; }
    
    .compensatorio-toggle-section { margin-top: 16px; }
    .toggle-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0;
      cursor: pointer; transition: all 0.2s; background: #f8fafc;
    }
    .toggle-card.active { border-color: #2563eb; background: #eff6ff; .t-label { color: #1e40af; } .toggle-action mat-icon { color: #2563eb; } }
    .toggle-info { display: flex; flex-direction: column; }
    .t-label { font-size: 13px; font-weight: 700; color: #475569; }
    .t-hint { font-size: 11px; color: #64748b; }
    .toggle-action mat-icon { font-size: 24px; width: 24px; height: 24px; color: #cbd5e1; }

    .dialog-actions {
      padding: 16px 24px; background: white; border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 20px;
    }

    .cancel-btn { font-weight: 600; color: #64748b; }
    .submit-btn {
      background: var(--primary) !important; color: white !important; padding: 0 24px;
      height: 44px; font-weight: 700; border-radius: 12px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .spacer { flex: 1; }
    .mat-mdc-form-field-subscript-wrapper { display: none; }
    .animated-fade { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ProgramarTurnoDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly turnosService = inject(TurnosService);

  readonly saving = signal(false);

  readonly presets = [
    { label: '06:00 - 13:20', start: '06:00', end: '13:20' },
    { label: '08:00 - 15:20', start: '08:00', end: '15:20' },
    { label: '09:20 - 16:40', start: '09:20', end: '16:40' },
    { label: '11:00 - 18:40', start: '11:00', end: '18:40' },
    { label: '12:40 - 20:00', start: '12:40', end: '20:00' }
  ];

  form = this.fb.nonNullable.group({
    usuario_id: [this.data.empleadoIdInicial ?? '', Validators.required],
    fecha: [
      this.data.fechaInicial ? new Date(this.data.fechaInicial + 'T12:00:00') : new Date(),
      Validators.required
    ],
    tipo: [(this.data.turno?.tipo as TipoTurno) ?? 'turno', Validators.required],
    es_compensatorio: [this.data.turno?.es_compensatorio ?? false],
    hora_inicio: [this.data.turno ? this.extractTime(this.data.turno.hora_inicio) : '08:00', Validators.required],
    hora_fin: [this.data.turno ? this.extractTime(this.data.turno.hora_fin) : '17:00', Validators.required]
  }, { validators: this.validarHoras });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProgramarTurnoData,
    public dialogRef: MatDialogRef<ProgramarTurnoDialogComponent>
  ) {}

  ngOnInit(): void {}

  setTipo(tipo: string): void {
    this.form.get('tipo')?.setValue(tipo as TipoTurno);
    // Si no es descanso, resetear compensatorio
    if (tipo !== 'descanso') {
      this.form.get('es_compensatorio')?.setValue(false);
    }
  }

  toggleCompensatorio(): void {
    const current = this.form.get('es_compensatorio')?.value;
    this.form.get('es_compensatorio')?.setValue(!current);
  }

  getSelectedEmpleadoName(): string {
    const id = this.form.get('usuario_id')?.value;
    if (!id) return 'Seleccionar empleado';
    return this.data.empleados.find(e => e.id === id)?.nombre_completo || 'Empleado';
  }

  applyPreset(p: any): void {
    this.form.patchValue({ hora_inicio: p.start, hora_fin: p.end });
  }

  onDateChange(): void {
    // Forzar actualización si es necesario
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const { usuario_id, fecha, tipo, hora_inicio, hora_fin } = this.form.getRawValue();
    const baseDate = DateTime.fromJSDate(fecha as Date);
    const dateStr = baseDate.toISODate(); // YYYY-MM-DD
    
    // Si no es turno, forzar horario completo del día
    const hInicio = tipo === 'turno' ? (hora_inicio || '08:00') : '00:00';
    const hFin = tipo === 'turno' ? (hora_fin || '17:00') : '23:59';

    // Detección de cruce de medianoche (ej: 21:00 a 05:00)
    let endDay = baseDate;
    const [hS, mS] = hInicio.split(':').map(Number);
    const [hE, mE] = hFin.split(':').map(Number);
    
    if (hE < hS || (hE === hS && mE < mS)) {
      endDay = baseDate.plus({ days: 1 });
    }

    const startUtc = `${dateStr}T${hInicio}:00Z`;
    const endUtc = `${endDay.toISODate()}T${hFin}:00Z`;

    const payload: TurnoPayload = {
      usuario_id: usuario_id,
      hora_inicio: startUtc,
      hora_fin: endUtc,
      tipo: tipo as TipoTurno,
      es_compensatorio: tipo === 'descanso' ? this.form.get('es_compensatorio')?.value : false
    };

    const request$ = this.data.turno
      ? this.turnosService.actualizarTurno(this.data.turno.id, payload)
      : this.turnosService.crearTurno(payload);

    request$.subscribe({
      next: (turno) => {
        this.snackBar.open('Programación guardada', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(turno);
      },
      error: (error) => {
        const msg = error.status === 409 
          ? 'Conflicto: ya existe una programación en este horario' 
          : 'Error al guardar la programación';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      },
      complete: () => this.saving.set(false)
    });
  }

  private validarHoras(control: AbstractControl): ValidationErrors | null {
    const tipo = control.get('tipo')?.value;
    if (tipo !== 'turno') return null;

    const start = control.get('hora_inicio')?.value;
    const end = control.get('hora_fin')?.value;
    if (!start || !end) return null;

    // Permitimos cruce de medianoche
    return null;
  }

  private extractTime(iso: string): string {
    return DateTime.fromISO(iso, { zone: 'utc' }).toFormat('HH:mm');
  }
}
