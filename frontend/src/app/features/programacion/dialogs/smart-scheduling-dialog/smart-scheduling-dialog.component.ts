import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatMenuModule } from '@angular/material/menu';
import { Grupo, Empleado } from '@core/models/operacion.models';
import { GrupoService } from '@core/services/grupo.service';
import { EmpleadoService } from '@core/services/empleado.service';
import { SmartSchedulingService } from '@core/services/smart-scheduling.service';
import { DateTime } from 'luxon';

@Component({
  selector: 'app-smart-scheduling-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatMenuModule
  ],
  templateUrl: './smart-scheduling-dialog.component.html',
  styleUrls: ['./smart-scheduling-dialog.component.scss']
})
export class SmartSchedulingDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SmartSchedulingDialogComponent>);
  private grupoService = inject(GrupoService);
  private empleadoService = inject(EmpleadoService);
  private smartService = inject(SmartSchedulingService);
  private snackBar = inject(MatSnackBar);

  // Forms for each step
  step1Form: FormGroup;
  step2Form: FormGroup;
  step3Form: FormGroup;
  step4Form: FormGroup;

  grupos = signal<Grupo[]>([]);
  empleados = signal<Empleado[]>([]);
  plantillas = signal<any[]>([]);
  selectedGrupoId = signal<string>('');
  loadedPlantillaId = signal<string | null>(null); // Nuevo signal para rastreo
  isSaving = signal(false);

  filteredEmpleados = computed(() => {
    const grupoId = this.selectedGrupoId();
    if (!grupoId) return [];
    return this.empleados().filter(e => e.grupo_id === grupoId);
  });

  constructor() {
    this.step1Form = this.fb.group({
      nombre_config: ['', Validators.required],
      grupo_id: ['', Validators.required],
      empleado_ids: [[], Validators.required]
    });

    this.step1Form.get('grupo_id')?.valueChanges.subscribe(val => {
      this.selectedGrupoId.set(val);
      // No limpiar si estamos cargando una plantilla
    });

    this.step2Form = this.fb.group({
      turnos: this.fb.array([
        this.fb.group({ inicio: ['08:00', Validators.required], fin: ['17:00', Validators.required] })
      ]),
      horas_max_dia: [7, [Validators.required, Validators.min(0), Validators.max(24)]],
      minutos_max_dia: [20, [Validators.required, Validators.min(0), Validators.max(59)]],
      horas_max_semana: [44, [Validators.required, Validators.min(1)]]
    });

    this.step3Form = this.fb.group({
      cobertura_sabado: [1, Validators.min(0)],
      cobertura_domingo: [1, Validators.min(0)],
      cobertura_festivo: [1, Validators.min(0)],
      dias_descanso: [[6, 7], Validators.required],
      incluir_festivos: [true],
      descansos_consecutivos: [true]
    });

    this.step4Form = this.fb.group({
      periodo: ['semana', Validators.required],
      tipo_rotacion: ['fijo', Validators.required],
      fecha_inicio: [DateTime.now().plus({ days: 1 }).toISODate(), Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarEmpleados();
    this.cargarPlantillas();
  }

  cargarPlantillas(): void {
    this.smartService.getConfiguraciones().subscribe(res => this.plantillas.set(res || []));
  }

  cargarConfiguracion(plantilla: any): void {
    const conf = plantilla.configuracion;
    this.loadedPlantillaId.set(plantilla.id); // Guardar el ID actual
    
    // Paso 1
    this.step1Form.patchValue({
      nombre_config: plantilla.nombre,
      grupo_id: plantilla.grupo_id,
      empleado_ids: conf.empleado_ids
    });

    // Paso 2 (Turnos)
    this.turnos.clear();
    conf.turnos.forEach((t: any) => {
      this.turnos.push(this.fb.group({ inicio: [t.inicio, Validators.required], fin: [t.fin, Validators.required] }));
    });

    // Paso 2 (Límites) - Manejar si vienen decimales o separados
    const h_totales = conf.horas_max_dia || 8;
    const h = Math.floor(h_totales);
    const m = Math.round((h_totales - h) * 60);

    this.step2Form.patchValue({
      horas_max_dia: h,
      minutos_max_dia: m,
      horas_max_semana: conf.horas_max_semana || 48
    });

    // Paso 3
    this.step3Form.patchValue({
      cobertura_sabado: conf.cobertura_sabado,
      cobertura_domingo: conf.cobertura_domingo,
      cobertura_festivo: conf.cobertura_festivo,
      dias_descanso: conf.dias_descanso || [6, 7],
      incluir_festivos: conf.incluir_festivos ?? true,
      descansos_consecutivos: conf.descansos_consecutivos ?? true
    });

    // Paso 4
    this.step4Form.patchValue({
      periodo: conf.periodo,
      tipo_rotacion: conf.tipo_rotacion
    });

    this.snackBar.open(`Plantilla "${plantilla.nombre}" cargada`, 'Cerrar', { duration: 2000 });
  }

  eliminarPlantilla(id: string): void {
    if (confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) {
      this.smartService.deleteConfiguracion(id).subscribe(() => {
        this.snackBar.open('Plantilla eliminada', 'Cerrar', { duration: 3000 });
        this.cargarPlantillas();
      });
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  get turnos() { return this.step2Form.get('turnos') as FormArray; }

  agregarTurno(): void {
    this.turnos.push(this.fb.group({ inicio: ['09:00', Validators.required], fin: ['18:00', Validators.required] }));
  }

  eliminarTurno(index: number): void {
    if (this.turnos.length > 1) this.turnos.removeAt(index);
  }

  cargarGrupos(): void {
    this.grupoService.getAll().subscribe(res => this.grupos.set(res.data || []));
  }

  cargarEmpleados(): void {
    this.empleadoService.getAll().subscribe(res => this.empleados.set(res.data || []));
  }

  onSelectAll(): void {
    const ids = this.filteredEmpleados().map(e => e.id);
    this.step1Form.patchValue({ empleado_ids: ids });
  }

  finalizarYGuardar(): void {
    if (this.step1Form.invalid || this.step2Form.invalid || this.step4Form.invalid) return;

    this.isSaving.set(true);
    const config = {
      nombre: this.step1Form.value.nombre_config,
      grupo_id: this.step1Form.value.grupo_id,
      configuracion: {
        empleado_ids: this.step1Form.value.empleado_ids,
        turnos: this.step2Form.value.turnos,
        horas_max_dia: (this.step2Form.value.horas_max_dia || 0) + ((this.step2Form.value.minutos_max_dia || 0) / 60),
        horas_max_semana: this.step2Form.value.horas_max_semana,
        cobertura_sabado: this.step3Form.value.cobertura_sabado || 0,
        cobertura_domingo: this.step3Form.value.cobertura_domingo || 0,
        cobertura_festivo: this.step3Form.value.cobertura_festivo || 0,
        dias_descanso: this.step3Form.value.dias_descanso || [],
        incluir_festivos: this.step3Form.value.incluir_festivos,
        descansos_consecutivos: this.step3Form.value.descansos_consecutivos,
        periodo: this.step4Form.value.periodo,
        tipo_rotacion: this.step4Form.value.tipo_rotacion
      }
    };

    const request = this.loadedPlantillaId() 
      ? this.smartService.updateConfiguracion(this.loadedPlantillaId()!, config as any)
      : this.smartService.saveConfiguracion(config as any);

    request.subscribe({
      next: (savedConfig) => {
        // Una vez guardada/actualizada la plantilla, procedemos a generar los turnos
        this.smartService.generarProgramacion(savedConfig, this.step4Form.value.fecha_inicio).subscribe({
          next: () => {
            this.snackBar.open('¡Programación generada con éxito!', 'Cerrar', { duration: 4000 });
            this.isSaving.set(false);
            this.dialogRef.close(true);
          },
          error: () => {
            this.snackBar.open('Configuración guardada, pero hubo un error al generar los turnos', 'Cerrar', { duration: 5000 });
            this.isSaving.set(false);
          }
        });
      },
      error: () => {
        this.snackBar.open('Error al guardar la configuración', 'Cerrar', { duration: 3000 });
        this.isSaving.set(false);
      }
    });
  }
}
