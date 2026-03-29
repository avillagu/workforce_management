import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatNativeDateModule } from '@angular/material/core'; // Nuevo import
import { DateTime } from 'luxon';
import * as XLSX from 'xlsx';
import { AsistenciasService } from '@core/services/asistencias.service';
import { GrupoService } from '@core/services/grupo.service';
import { EmpleadoService } from '@core/services/empleado.service';
import { Grupo, Empleado } from '@core/models/operacion.models';

@Component({
  selector: 'app-exportar-asistencias-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatNativeDateModule
  ],
  templateUrl: './exportar-asistencias-dialog.component.html',
  styleUrls: ['./exportar-asistencias-dialog.component.scss']
})
export class ExportarAsistenciasDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ExportarAsistenciasDialogComponent>);
  private asistenciasService = inject(AsistenciasService);
  private grupoService = inject(GrupoService);
  private empleadoService = inject(EmpleadoService);
  private snackBar = inject(MatSnackBar);

  exportForm: FormGroup;
  grupos = signal<Grupo[]>([]);
  empleados = signal<Empleado[]>([]);
  isExporting = signal(false);

  constructor() {
    const hoy = DateTime.now();
    this.exportForm = this.fb.group({
      desde: [hoy.startOf('month').toJSDate(), Validators.required],
      hasta: [hoy.endOf('month').toJSDate(), Validators.required],
      grupo_id: [''],
      usuario_id: ['']
    });
  }

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarEmpleados();
  }

  cargarGrupos(): void {
    this.grupoService.getAll().subscribe(res => this.grupos.set(res.data));
  }

  cargarEmpleados(): void {
    this.empleadoService.getAll().subscribe(res => this.empleados.set(res.data));
  }

  onGrupoChange(): void {
    const grupoId = this.exportForm.get('grupo_id')?.value;
    // We could filter the employee list locally
    this.exportForm.patchValue({ usuario_id: '' });
  }

  get filteredEmpleadosList(): Empleado[] {
    const grupoId = this.exportForm.get('grupo_id')?.value;
    if (!grupoId) return this.empleados();
    return this.empleados().filter(e => e.grupo_id === grupoId);
  }

  exportar(): void {
    if (this.exportForm.invalid) return;

    this.isExporting.set(true);
    const formValue = this.exportForm.value;
    
    const filtros = {
      desde: DateTime.fromJSDate(formValue.desde).toISODate()!,
      hasta: DateTime.fromJSDate(formValue.hasta).toISODate()!,
      grupo_id: formValue.grupo_id || undefined,
      usuario_id: formValue.usuario_id || undefined
    };

    this.asistenciasService.getHistorial(filtros).subscribe({
      next: (data) => {
        if (data.length === 0) {
          this.snackBar.open('No hay datos para exportar con los filtros seleccionados', 'Cerrar', { duration: 3000 });
          this.isExporting.set(false);
          return;
        }
        this.generarExcel(data);
        this.isExporting.set(false);
        this.dialogRef.close();
      },
      error: () => {
        this.snackBar.open('Error al obtener datos para exportación', 'Cerrar', { duration: 3000 });
        this.isExporting.set(false);
      }
    });
  }

  private generarExcel(data: any[]): void {
    // Format data for Excel
    const excelData = data.map(item => ({
      'Empleado': item.usuario_nombre || 'N/A',
      'Grupo': item.grupo_nombre || 'N/A',
      'Estado': this.getLabelEstado(item.estado),
      'Hora Inicio': DateTime.fromISO(item.hora_inicio).setLocale('es').toFormat('dd/MM/yyyy HH:mm'),
      'Hora Fin': item.hora_fin ? DateTime.fromISO(item.hora_fin).setLocale('es').toFormat('dd/MM/yyyy HH:mm') : 'En curso',
      'Duración': (item.duracion && typeof item.duracion === 'object') ? (item.duracion.texto || '-') : (item.duracion || '-')
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');

    // Auto-width
    const wscols = [
      { wch: 30 }, // Empleado
      { wch: 20 }, // Grupo
      { wch: 15 }, // Estado
      { wch: 20 }, // Hora Inicio
      { wch: 20 }, // Hora Fin
      { wch: 15 }  // Duración
    ];
    worksheet['!cols'] = wscols;

    const fileName = `asistencias_${DateTime.now().toFormat('yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    this.snackBar.open('Excel generado exitosamente', 'Cerrar', { duration: 3000 });
  }

  private getLabelEstado(estado: string): string {
    const labels: any = {
      'disponible': 'Disponible',
      'descanso': 'Descanso',
      'en_bano': 'En baño',
      'fuera_de_turno': 'Fuera de turno'
    };
    return labels[estado] || estado;
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
