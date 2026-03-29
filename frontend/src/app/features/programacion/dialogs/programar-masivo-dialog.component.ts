import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { Empleado } from '@core/models/operacion.models';
import { TurnosService } from '@core/services/turnos.service';
import { ProgramacionMasivaDto } from '@core/models/turno.model';

export interface ProgramarMasivoData {
  empleados: Empleado[];
}

@Component({
  selector: 'app-programar-masivo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-shell">
      <header class="dialog-header">
        <div class="icon-badge mass">
          <mat-icon>event_repeat</mat-icon>
        </div>
        <div>
          <p class="eyebrow">Programación Masiva</p>
          <h2>Multiplica turnos para el equipo</h2>
          <small>Selecciona empleados, rango de fechas y horario estándar.</small>
        </div>
        <button mat-icon-button mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <form class="dialog-body" [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline">
          <mat-label>Empleados</mat-label>
          <mat-select formControlName="empleado_ids" multiple>
            <mat-option *ngFor="let emp of data.empleados" [value]="emp.id">
              {{ emp.nombre_completo }} (&#64;{{ emp.username }})
            </mat-option>
          </mat-select>
          <mat-hint>Selecciona ninguno para incluir a todos</mat-hint>
        </mat-form-field>

        <div class="double">
          <mat-form-field appearance="outline">
            <mat-label>Fecha inicio</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="fecha_inicio" required />
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            <mat-error>Requerido</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fecha fin</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="fecha_fin" required />
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
            <mat-error>
              {{ form.hasError('rangoInvalido') ? 'La fecha fin debe ser posterior' : 'Requerido' }}
            </mat-error>
          </mat-form-field>
        </div>

        <div class="double">
          <mat-form-field appearance="outline">
            <mat-label>Hora inicio diaria</mat-label>
            <input matInput type="time" formControlName="hora_inicio" required />
            <mat-error>Requerido</mat-error>
          </mat-form-field>

        <mat-form-field appearance="outline">
            <mat-label>Hora fin diaria</mat-label>
            <input matInput type="time" formControlName="hora_fin" required />
            <mat-error>
              {{ form.hasError('horaInvalida') ? 'Fin debe ser mayor a inicio' : 'Requerido' }}
            </mat-error>
          </mat-form-field>
        </div>

        <mat-checkbox formControlName="excluir_fines_de_semana">
          Excluir fines de semana
        </mat-checkbox>

        <div class="summary" *ngIf="form.valid">
          <mat-icon>info</mat-icon>
          <span>Se crearían aproximadamente {{ estimarTurnos() }} turnos</span>
        </div>

        <div class="actions">
          <button mat-stroked-button mat-dialog-close type="button">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            <mat-icon>bolt</mat-icon>
            {{ saving() ? 'Programando...' : 'Programar masivo' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .dialog-shell {
        width: 100%;
        max-width: 680px;
      }
      .dialog-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .icon-badge {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: #fff;
        background: linear-gradient(135deg, #14b8a6, #22d3ee);
      }
      .icon-badge.mass {
        background: linear-gradient(135deg, #a855f7, #6366f1);
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 11px;
        margin: 0;
      }
      h2 {
        margin: 2px 0 0;
      }
      small {
        color: #6b7280;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .double {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 6px;
      }
      .summary {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f1f5f9;
        padding: 10px;
        border-radius: 10px;
        color: #0f172a;
      }
    `
  ]
})
export class ProgramarMasivoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly turnosService = inject(TurnosService);

  readonly saving = signal(false);

  readonly form = this.fb.group(
    {
      empleado_ids: [this.data.empleados.map((e) => e.id)],
      fecha_inicio: [new Date(), Validators.required],
      fecha_fin: [DateTime.now().plus({ days: 4 }).toJSDate(), Validators.required],
      hora_inicio: ['08:00', Validators.required],
      hora_fin: ['17:00', Validators.required],
      excluir_fines_de_semana: [false]
    },
    {
      validators: (control) => {
        const rango = this.validarRangoFechas(control);
        const horas = this.validarHoras(control);
        return rango || horas ? { ...rango, ...horas } : null;
      }
    }
  );

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProgramarMasivoData,
    private readonly dialogRef: MatDialogRef<ProgramarMasivoDialogComponent, boolean>
  ) {}

  onSubmit(): void {
    if (this.form.invalid) return;
    const total = this.estimarTurnos();
    const confirmed = confirm(`Se crearán aproximadamente ${total} turnos. ¿Deseas continuar?`);
    if (!confirmed) return;

    this.saving.set(true);
    const dto = this.toPayload();
    this.turnosService.programacionMasiva(dto).subscribe({
      next: () => {
        this.snackBar.open('Programación masiva enviada', 'Cerrar', { duration: 3500 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        if (error.status === 409) {
          this.snackBar.open('Conflictos detectados en el rango seleccionado', 'Cerrar', {
            duration: 4500
          });
        } else {
          this.snackBar.open('No se pudo completar la programación masiva', 'Cerrar', {
            duration: 4000
          });
        }
      },
      complete: () => this.saving.set(false)
    });
  }

  estimarTurnos(): number {
    if (this.form.invalid) return 0;
    const empleadosSeleccionados =
      this.form.value.empleado_ids && this.form.value.empleado_ids.length > 0
        ? this.form.value.empleado_ids.length
        : this.data.empleados.length;

    const dias = this.contarDias();
    return empleadosSeleccionados * dias;
  }

  private contarDias(): number {
    const start = DateTime.fromJSDate(this.form.value.fecha_inicio as Date).startOf('day');
    const end = DateTime.fromJSDate(this.form.value.fecha_fin as Date).startOf('day');
    let count = 0;
    let cursor = start;
    while (cursor <= end) {
      if (this.form.value.excluir_fines_de_semana && (cursor.weekday === 6 || cursor.weekday === 7)) {
        cursor = cursor.plus({ days: 1 });
        continue;
      }
      count++;
      cursor = cursor.plus({ days: 1 });
    }
    return count;
  }

  private toPayload(): ProgramacionMasivaDto {
    const { empleado_ids, fecha_inicio, fecha_fin, hora_inicio, hora_fin, excluir_fines_de_semana } =
      this.form.getRawValue();
    return {
      empleado_ids: empleado_ids && empleado_ids.length > 0 ? empleado_ids : this.data.empleados.map((e) => e.id),
      fecha_inicio: DateTime.fromJSDate(fecha_inicio!).toISODate()!,
      fecha_fin: DateTime.fromJSDate(fecha_fin!).toISODate()!,
      hora_inicio: hora_inicio!,
      hora_fin: hora_fin!,
      excluir_fines_de_semana: excluir_fines_de_semana ?? false
    };
  }

  private validarRangoFechas(control: AbstractControl): ValidationErrors | null {
    const start = control.get('fecha_inicio')?.value as Date;
    const end = control.get('fecha_fin')?.value as Date;
    if (!start || !end) return null;
    return DateTime.fromJSDate(end) < DateTime.fromJSDate(start) ? { rangoInvalido: true } : null;
  }

  private validarHoras(control: AbstractControl): ValidationErrors | null {
    const start = control.get('hora_inicio')?.value;
    const end = control.get('hora_fin')?.value;
    if (!start || !end) return null;
    const startDate = DateTime.fromFormat(start, 'HH:mm');
    const endDate = DateTime.fromFormat(end, 'HH:mm');
    return endDate <= startDate ? { horaInvalida: true } : null;
  }
}
