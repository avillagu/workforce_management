import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { DateTime } from 'luxon';
import { Empleado } from '@core/models/operacion.models';
import { TurnosService } from '@core/services/turnos.service';
import { ExcelService } from '@core/services/excel.service';

@Component({
  selector: 'app-exportar-programacion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="export-dialog">
      <div class="dialog-header">
        <mat-icon class="header-icon">file_download</mat-icon>
        <h2 mat-dialog-title>Exportar Programación a Excel</h2>
      </div>

      <div mat-dialog-content>
        <p class="intro-text">Selecciona el rango de fechas que deseas exportar a tu reporte Excel.</p>
        
        <form [formGroup]="rangeForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Rango de fechas</mat-label>
            <mat-date-range-input [rangePicker]="picker">
              <input matStartDate formControlName="start" placeholder="Fecha inicio">
              <input matEndDate formControlName="end" placeholder="Fecha fin">
            </mat-date-range-input>
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-date-range-picker #picker></mat-date-range-picker>
            <mat-error *ngIf="rangeForm.get('start')?.hasError('required')">Fecha inicio requerida</mat-error>
          </mat-form-field>
        </form>

        <div class="export-preview" *ngIf="rangeForm.valid">
          <mat-icon color="primary">info</mat-icon>
          <p>Se exportarán <strong>{{ getAffectedEmployees() }} empleados</strong> para el período seleccionado.</p>
        </div>
      </div>

      <div mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button 
          mat-flat-button 
          color="primary" 
          [disabled]="rangeForm.invalid || isExporting()" 
          (click)="onExport()"
        >
          <mat-icon *ngIf="!isExporting()">download</mat-icon>
          {{ isExporting() ? 'Generando...' : 'Descargar Excel' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .export-dialog { padding: 10px; }
    .dialog-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .header-icon { color: #10b981; font-size: 28px; width: 28px; height: 28px; }
    h2 { margin: 0; font-size: 20px; font-weight: 800; color: #1e293b; }
    .intro-text { color: #64748b; font-size: 13.5px; margin-bottom: 24px; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .export-preview { 
      display: flex; align-items: center; gap: 12px; background: #eff6ff;
      padding: 12px 16px; border-radius: 8px; margin-top: 16px; border: 1px solid #bfdbfe;
      mat-icon { font-size: 20px; width: 20px; height: 20px; } 
      p { margin: 0; font-size: 13px; color: #1e40af; }
    }
  `]
})
export class ExportarProgramacionDialogComponent {
  private readonly turnosService = inject(TurnosService);
  private readonly excelService = inject(ExcelService);
  private readonly dialogRef = inject(MatDialogRef<ExportarProgramacionDialogComponent>);

  readonly isExporting = signal(false);

  rangeForm = new FormGroup({
    start: new FormControl<Date | null>(DateTime.now().startOf('week').toJSDate(), [Validators.required]),
    end: new FormControl<Date | null>(DateTime.now().endOf('week').toJSDate(), [Validators.required])
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: { empleados: Empleado[] }) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  getAffectedEmployees(): number {
    return this.data.empleados.length;
  }

  onExport(): void {
    const { start, end } = this.rangeForm.value;
    if (!start || !end) return;

    this.isExporting.set(true);
    
    const startStr = DateTime.fromJSDate(start).toISODate()!;
    const endStr = DateTime.fromJSDate(end).toISODate()!;

    // 1. Obtener todos los turnos del rango
    this.turnosService.getTurnos(startStr, endStr).subscribe({
      next: (allTurnos) => {
        // 2. Generar matriz de fechas
        const daysItems = [];
        let cursor = DateTime.fromJSDate(start);
        const last = DateTime.fromJSDate(end);
        while (cursor <= last) {
          daysItems.push({ date: cursor, label: cursor.toFormat('EEE d') });
          cursor = cursor.plus({ days: 1 });
        }

        // 3. Exportar
        const filename = `Programacion_${startStr}_al_${endStr}`;
        this.excelService.exportScheduleToExcel(
          daysItems,
          this.data.empleados,
          (empId, day) => {
            return allTurnos.filter(t => 
              t.usuario_id === empId && 
              DateTime.fromISO(t.hora_inicio, { zone: 'utc' }).hasSame(day, 'day')
            );
          },
          (t) => {
             if (t.tipo && t.tipo !== 'turno') return t.tipo.toUpperCase();
             const hIn = DateTime.fromISO(t.hora_inicio, { zone: 'utc' }).toFormat('HH:mm');
             const hOut = DateTime.fromISO(t.hora_fin, { zone: 'utc' }).toFormat('HH:mm');
             return `${hIn} - ${hOut}`;
          },
          filename
        );

        this.isExporting.set(false);
        this.dialogRef.close();
      },
      error: () => {
        this.isExporting.set(false);
      }
    });
  }
}
