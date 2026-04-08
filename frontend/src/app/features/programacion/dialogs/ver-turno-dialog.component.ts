import { Component, Inject, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  ValidationErrors,
  AbstractControl
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { Empleado } from '@core/models/operacion.models';
import { Turno, TurnoPayload, TipoTurno } from '@core/models/turno.model';
import { TurnosService } from '@core/services/turnos.service';

export interface VerTurnoData {
  turno: Turno;
  empleados: Empleado[];
  isAdmin: boolean;
}

@Component({
  selector: 'app-ver-turno-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  template: `
    <div class="premium-dialog">
      <div class="dialog-header dark-header">
        <div class="icon-badge violet-gradient-badge">
          <mat-icon>{{ getIcon(turno().tipo) }}</mat-icon>
        </div>
        <div class="header-info">
          <p class="eyebrow">DETALLE DE PROGRAMACIÓN</p>
          <h2>{{ turno().tipo === 'turno' ? 'Turno Programado' : (turno().tipo | uppercase) }}</h2>
          <p class="subtitle">{{ formatHeaderDate(turno()) }}</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn white-icon">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <!-- VISTA DE LECTURA -->
        <ng-container *ngIf="!editMode()">
          <div class="view-grid animated-fade">
            <div class="info-card">
              <div class="card-icon"><mat-icon>person</mat-icon></div>
              <div class="card-content">
                <label>Colaborador</label>
                <p>{{ turno().empleado_nombre || resolveEmpleado(turno().usuario_id) }}</p>
              </div>
            </div>

            <div class="info-card">
              <div class="card-icon"><mat-icon>history</mat-icon></div>
              <div class="card-content">
                <label>Horario</label>
                <p>{{ formatTimeRange(turno()) }}</p>
              </div>
            </div>

            <div class="info-card">
              <div class="card-icon"><mat-icon>event</mat-icon></div>
              <div class="card-content">
                <label>Fecha de Programación</label>
                <p>{{ formatDateFull(turno().hora_inicio) }}</p>
              </div>
            </div>

            <div class="info-card" *ngIf="turno().tipo === 'descanso' && turno().es_compensatorio">
              <div class="card-icon highlight-icon"><mat-icon>star</mat-icon></div>
              <div class="card-content">
                <label>Tipo de Descanso</label>
                <p>COMPENSATORIO</p>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- VISTA DE EDICIÓN -->
        <form *ngIf="editMode()" [formGroup]="form" class="animated-fade">
          <section class="form-section">
            <h3 class="section-title"><mat-icon>edit</mat-icon> Modificar Registro</h3>
            
            <div class="custom-type-selector">
              <div *ngFor="let t of [
                {v:'turno', l:'Turno'}, {v:'descanso', l:'Descanso'}, 
                {v:'permiso', l:'Permiso'}, {v:'incapacidad', l:'Incapacidad'}
              ]"
                class="type-option"
                [class.active]="form.get('tipo')?.value === t.v"
                (click)="setTipo(t.v)">
                {{ t.l }}
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Empleado</mat-label>
              <mat-select formControlName="usuario_id">
                <mat-option *ngFor="let emp of data.empleados" [value]="emp.id">
                  {{ emp.nombre_completo }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="range-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Fecha</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="fecha">
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>
            </div>

            <div class="time-grid-individual" *ngIf="form.get('tipo')?.value === 'turno'">
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
        </form>
      </mat-dialog-content>

      <div class="dialog-actions">
        <div class="spacer"></div>
        <div class="button-group" *ngIf="!editMode()">
          <button mat-button (click)="editMode.set(true)" *ngIf="data.isAdmin" class="secondary-premium-btn">
            <mat-icon>edit</mat-icon> Editar
          </button>
          <button mat-flat-button color="warn" (click)="onDelete()" *ngIf="data.isAdmin" class="danger-premium-btn">
            <mat-icon>delete</mat-icon> Eliminar
          </button>
        </div>
        <div class="button-group" *ngIf="editMode()">
          <button mat-button (click)="editMode.set(false)" class="cancel-btn">Cancelar</button>
          <button mat-flat-button class="submit-btn" [disabled]="form.invalid || saving()" (click)="onUpdate()">
            <mat-icon>save</mat-icon> {{ saving() ? 'Guardando...' : 'Guardar Cambios' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .premium-dialog {
      --primary: #2563eb;
      --violet: #7c3aed;
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

    .violet-gradient-badge {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center; color: white;
    }

    .header-info h2 { margin: 0; font-size: 20px; font-weight: 800; color: white; }
    .eyebrow { text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #a855f7; margin: 0; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #94a3b8; }
    .white-icon { color: white !important; }

    .dialog-content { padding: 24px; background: var(--bg-light); max-height: 60vh; overflow-y: auto; }

    .view-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }

    .info-card {
      background: white; border: 1px solid var(--border); border-radius: 14px;
      padding: 14px 18px; display: flex; align-items: center; gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .card-icon {
      width: 36px; height: 36px; background: #f1f5f9; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: #64748b;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .card-content label { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
    .card-content p { margin: 0; font-size: 14px; font-weight: 600; color: #1e293b; }

    /* EDIT MODE STYLES */
    .form-section { background: white; border-radius: 16px; padding: 20px; border: 1px solid var(--border); }
    .section-title { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px; }
    .section-title mat-icon { font-size: 18px; color: var(--primary); }

    .custom-type-selector { display: flex; background: #f1f5f9; padding: 4px; border-radius: 14px; gap: 4px; margin-bottom: 16px; }
    .type-option { flex: 1; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: #64748b; font-weight: 700; font-size: 12px; cursor: pointer; }
    .type-option.active { background: white; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }

    .time-grid-individual { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .full-width { width: 100%; }

    .highlight-icon { background: #eff6ff !important; color: #3b82f6 !important; }
    
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

    .dialog-actions { padding: 16px 24px; background: white; border-top: 1px solid var(--border); display: flex; gap: 12px; }
    .button-group { display: flex; gap: 10px; width: 100%; justify-content: flex-end; }

    .secondary-premium-btn { font-weight: 700; border: 1px solid var(--border); border-radius: 12px; color: #1e293b; height: 44px; padding: 0 20px !important; }
    .danger-premium-btn { background: #fee2e2 !important; color: #dc2626 !important; border-radius: 12px; font-weight: 700; height: 44px; padding: 0 20px !important; box-shadow: none !important; }
    .submit-btn { background: var(--primary) !important; color: white !important; border-radius: 12px; font-weight: 700; height: 44px; padding: 0 24px !important; }
    .cancel-btn { font-weight: 600; color: #64748b; }

    .spacer { flex: 1; }
    .mat-mdc-form-field-subscript-wrapper { display: none; }
    .animated-fade { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class VerTurnoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly turnosService = inject(TurnosService);

  readonly editMode = signal(false);
  readonly saving = signal(false);
  readonly turno = signal(this.data.turno);

  readonly form = this.fb.nonNullable.group({
    usuario_id: [this.data.turno.usuario_id, Validators.required],
    fecha: [DateTime.fromISO(this.data.turno.hora_inicio).toJSDate(), Validators.required],
    tipo: [this.data.turno.tipo as TipoTurno, Validators.required],
    es_compensatorio: [this.data.turno.es_compensatorio ?? false],
    hora_inicio: [this.extractTime(this.data.turno.hora_inicio), Validators.required],
    hora_fin: [this.extractTime(this.data.turno.hora_fin), Validators.required]
  }, { validators: this.validarHoras });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: VerTurnoData,
    public dialogRef: MatDialogRef<VerTurnoDialogComponent, { action: 'updated' | 'deleted'; turno?: Turno } | undefined>
  ) {}

  formatHeaderDate(turno: Turno): string {
    const start = DateTime.fromISO(turno.hora_inicio, { zone: 'utc' }).toLocal();
    return start.setLocale('es').toFormat('dd MMMM yyyy');
  }

  formatTimeRange(turno: Turno): string {
    const start = DateTime.fromISO(turno.hora_inicio, { zone: 'utc' }).toLocal();
    const end = DateTime.fromISO(turno.hora_fin, { zone: 'utc' }).toLocal();
    return `${start.toFormat('HH:mm')} - ${end.toFormat('HH:mm')}`;
  }

  formatDateFull(iso: string): string {
    return DateTime.fromISO(iso, { zone: 'utc' }).setLocale('es').toFormat('EEEE, dd LLL yyyy');
  }

  formatCreated(created: string): string {
    return DateTime.fromISO(created, { zone: 'utc' }).toLocal().toFormat('dd LLL yyyy, HH:mm');
  }

  resolveEmpleado(id: string): string {
    return this.data.empleados.find((e) => e.id === id)?.nombre_completo ?? 'Empleado';
  }

  getIcon(tipo?: string): string {
    switch (tipo) {
      case 'descanso': return 'bedtime';
      case 'permiso': return 'event_busy';
      case 'incapacidad': return 'health_and_safety';
      default: return 'event_note';
    }
  }

  setTipo(tipo: string): void {
    this.form.get('tipo')?.setValue(tipo as TipoTurno);
    if (tipo !== 'descanso') {
      this.form.get('es_compensatorio')?.setValue(false);
    }
  }

  toggleCompensatorio(): void {
    const current = this.form.get('es_compensatorio')?.value;
    this.form.get('es_compensatorio')?.setValue(!current);
  }

  onDelete(): void {
    this.turnosService.eliminarTurno(this.turno().id).subscribe({
      next: () => this.dialogRef.close({ action: 'deleted' }),
      error: () => this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 })
    });
  }

  onUpdate(): void {
    if (this.form.invalid) return;
    this.saving.set(true);

    const { usuario_id, fecha, tipo, hora_inicio, hora_fin } = this.form.getRawValue();
    const baseDate = DateTime.fromJSDate(fecha as Date);
    
    const hInicio = tipo === 'turno' ? hora_inicio : '00:00';
    const hFin = tipo === 'turno' ? hora_fin : '23:59';

    const startUtc = baseDate.set({ 
      hour: parseInt(hInicio.split(':')[0]), 
      minute: parseInt(hInicio.split(':')[1]) 
    }).toUTC().toISO()!;

    const endUtc = baseDate.set({ 
      hour: parseInt(hFin.split(':')[0]), 
      minute: parseInt(hFin.split(':')[1]) 
    }).toUTC().toISO()!;

    const payload: TurnoPayload = {
      usuario_id: usuario_id,
      hora_inicio: startUtc,
      hora_fin: endUtc,
      tipo: tipo as TipoTurno,
      es_compensatorio: tipo === 'descanso' ? this.form.get('es_compensatorio')?.value : false
    };

    this.turnosService.actualizarTurno(this.turno().id, payload).subscribe({
      next: (turno) => {
        this.turno.set(turno);
        this.dialogRef.close({ action: 'updated', turno });
      },
      error: () => this.snackBar.open('No se pudo actualizar', 'Cerrar', { duration: 3500 }),
      complete: () => this.saving.set(false)
    });
  }

  private validarHoras(control: AbstractControl): ValidationErrors | null {
    const tipo = control.get('tipo')?.value;
    if (tipo !== 'turno') return null;
    const start = control.get('hora_inicio')?.value;
    const end = control.get('hora_fin')?.value;
    if (!start || !end) return null;
    const s = DateTime.fromFormat(start, 'HH:mm');
    const e = DateTime.fromFormat(end, 'HH:mm');
    return e <= s && end !== '00:00' ? { horaInvalida: true } : null;
  }

  private extractTime(iso: string): string {
    return DateTime.fromISO(iso, { zone: 'utc' }).toFormat('HH:mm');
  }
}
