import { Component, Inject, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { Empleado, Grupo } from '@core/models/operacion.models';
import { TurnosService } from '@core/services/turnos.service';
import { GrupoService } from '@core/services/grupo.service';
import { ProgramacionMasivaDto, TipoTurno } from '@core/models/turno.model';
import { PreajusteTurno } from '@core/models/preajuste.model';
import { PreajustesService } from '@core/services/preajustes.service';
import { GestionPreajustesDialogComponent } from './gestion-preajustes-dialog.component';

export interface ProgramarTurnosData {
  empleados: Empleado[];
}

@Component({
  selector: 'app-programar-turnos-dialog',
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
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="premium-dialog">
      <div class="dialog-header primary-gradient">
        <div class="icon-badge">
          <mat-icon>calendar_month</mat-icon>
        </div>
        <div class="header-info">
          <p class="eyebrow">PROGRAMACIÓN DE PERSONAL</p>
          <h2>Nueva Planificación</h2>
          <p class="subtitle">Asigna turnos, descansos o novedades de forma masiva</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="form">
          <!-- Paso 1: Selección de Personal -->
          <section class="form-section">
            <h3 class="section-title"><mat-icon>group</mat-icon> Selección de Personal</h3>
            <div class="selection-grid">
              <div class="filter-wrapper">
                <label class="p-label">Filtro de Grupo</label>
                <button 
                  mat-flat-button 
                  type="button"
                  class="premium-pill-btn" 
                  [matMenuTriggerFor]="dlgGroupMenu"
                >
                  <div class="pill-content">
                    <mat-icon class="pill-icon">groups</mat-icon>
                    <span class="pill-label">{{ getSelectedGrupoName() }}</span>
                    <mat-icon class="pill-chevron">expand_more</mat-icon>
                  </div>
                </button>

                <mat-menu #dlgGroupMenu="matMenu" class="premium-selector-menu">
                  <button mat-menu-item (click)="onGroupChange('')" [class.active-item]="!form.get('grupo_id')?.value">
                    <mat-icon>all_inclusive</mat-icon>
                    <span>Todos los Grupos</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button 
                    mat-menu-item 
                    *ngFor="let g of grupos()" 
                    (click)="onGroupChange(g.id)"
                    [class.active-item]="form.get('grupo_id')?.value === g.id"
                  >
                    <mat-icon>group_work</mat-icon>
                    <span>{{ g.nombre }}</span>
                  </button>
                </mat-menu>
              </div>

              <div class="filter-wrapper">
                <label class="p-label">Seleccionar Empleados</label>
                <button 
                  mat-flat-button 
                  type="button"
                  class="premium-pill-btn multi-select-pill" 
                  [matMenuTriggerFor]="dlgEmpMenu"
                  [class.has-selection]="(form.get('empleado_ids')?.value?.length || 0) > 0"
                >
                  <div class="pill-content">
                    <mat-icon class="pill-icon">person_search</mat-icon>
                    <span class="pill-label">
                       {{ (form.get('empleado_ids')?.value?.length || 0) }} seleccionados
                    </span>
                    <mat-icon class="pill-chevron">expand_more</mat-icon>
                  </div>
                </button>

                <mat-menu #dlgEmpMenu="matMenu" class="premium-selector-menu multi-menu">
                  <div class="menu-actions" (click)="$event.stopPropagation()">
                    <button mat-button color="primary" (click)="selectAllEmps()">Todo el Grupo</button>
                    <button mat-button (click)="form.get('empleado_ids')?.setValue([])">Limpiar</button>
                  </div>
                  <mat-divider></mat-divider>
                  <div class="scrollable-menu-items">
                    <button 
                      mat-menu-item 
                      *ngFor="let e of empleados()" 
                      (click)="toggleEmpleadoSelection(e.id); $event.stopPropagation()"
                      class="emp-menu-item-row"
                    >
                      <div class="chk-container">
                        <mat-icon class="chk-icon" [class.is-checked]="isEmpleadoSelected(e.id)">
                          {{ isEmpleadoSelected(e.id) ? 'check_box' : 'check_box_outline_blank' }}
                        </mat-icon>
                        <span class="chk-label">{{ e.nombre_completo }}</span>
                      </div>
                    </button>
                  </div>
                </mat-menu>
              </div>
            </div>
          </section>

          <!-- Paso 2: Período y Días -->
          <section class="form-section">
            <h3 class="section-title"><mat-icon>date_range</mat-icon> Período y Días</h3>
            <div class="range-grid">
              <mat-form-field appearance="outline" class="full-width" formGroupName="rango">
                <mat-label>Rango de fechas*</mat-label>
                <mat-date-range-input [rangePicker]="picker">
                  <input matStartDate formControlName="start" placeholder="Inicio">
                  <input matEndDate formControlName="end" placeholder="Fin">
                </mat-date-range-input>
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-date-range-picker #picker></mat-date-range-picker>
              </mat-form-field>

              <div class="days-selector full-width">
                <p class="label-hint">Días aplicables:</p>
                <div class="custom-days-selector">
                  <div *ngFor="let d of [
                    {v:1, l:'L'}, {v:2, l:'M'}, {v:3, l:'X'}, 
                    {v:4, l:'J'}, {v:5, l:'V'}, {v:6, l:'S'}, {v:7, l:'D'}
                  ]" 
                    class="day-chip" 
                    [class.selected]="isDaySelected(d.v)"
                    (click)="toggleDay(d.v)">
                    {{ d.l }}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Paso 3: Configuración del Turno -->
          <section class="form-section">
            <h3 class="section-title"><mat-icon>timer</mat-icon> Tipo y Horario</h3>
            
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

            <div class="time-grid" *ngIf="form.get('tipo')?.value === 'turno'">
              <mat-form-field appearance="outline">
                <mat-label>Hora Inicio</mat-label>
                <input matInput type="time" formControlName="hora_inicio">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hora Fin</mat-label>
                <input matInput type="time" formControlName="hora_fin">
                <mat-error *ngIf="form.hasError('horaInvalida')">El fin debe ser posterior</mat-error>
              </mat-form-field>

              <div class="filter-wrapper">
                <div class="label-with-action">
                  <label class="p-label">Preajustes Rápidos</label>
                  <button mat-icon-button (click)="openGestionPreajustes()" class="config-btn" matTooltip="Gestionar Preajustes">
                    <mat-icon>settings</mat-icon>
                  </button>
                </div>
                <button 
                  mat-flat-button 
                  type="button"
                  class="premium-pill-btn preset-pill" 
                  [matMenuTriggerFor]="presetMenu"
                >
                  <div class="pill-content">
                    <mat-icon class="pill-icon">schedule</mat-icon>
                    <span class="pill-label">{{ getSelectedPresetLabel() }}</span>
                    <mat-icon class="pill-chevron">expand_more</mat-icon>
                  </div>
                </button>

                <mat-menu #presetMenu="matMenu" class="premium-selector-menu">
                  <button mat-menu-item (click)="onPresetChange('')" [class.active-item]="!activePresetLabel">
                    <mat-icon>timer_off</mat-icon>
                    <span>Personalizado</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button 
                    mat-menu-item 
                    *ngFor="let p of presets()" 
                    (click)="onPresetChange(p.hora_inicio + '-' + p.hora_fin, p.nombre)"
                    [class.active-item]="activePresetLabel === p.nombre"
                  >
                    <mat-icon>{{ p.icono || 'schedule' }}</mat-icon>
                    <span>{{ p.nombre }}</span>
                  </button>
                </mat-menu>
              </div>
            </div>
          </section>
        </form>
      </mat-dialog-content>

      <div class="dialog-actions">
        <div class="summary-card" *ngIf="totalRegistros() > 0">
          <div class="summary-icon">
            <mat-icon>auto_awesome</mat-icon>
          </div>
          <div class="summary-text">
            Se generarán aprox.<br>
            <strong>{{ totalRegistros() }} registros</strong>
          </div>
        </div>

        <div class="spacer"></div>
        
        <mat-checkbox [formControl]="form.controls.sobrescribir" class="overwrite-check">
          Sobrescribir turnos existentes
        </mat-checkbox>

        <div class="button-group">
          <button mat-button (click)="dialogRef.close()" class="cancel-btn">Cancelar</button>
          <button mat-flat-button 
                  class="submit-btn"
                  [disabled]="form.invalid || loading()"
                  (click)="onSubmit()">
            <mat-icon>bolt</mat-icon>
            {{ loading() ? 'Programando...' : 'Programar Turnos' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .premium-dialog {
      --primary: #2563eb;
      --primary-dark: #1e40af;
      --bg-light: #f8fafc;
      --border: #e2e8f0;
      padding: 0;
      overflow: hidden;
    }

    .dialog-header {
      padding: 20px 24px;
      background: white;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
    }

    .icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .primary-gradient {
      background: #1e293b;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .header-info h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: white;
    }

    .eyebrow {
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #3b82f6;
      margin: 0;
    }

    .subtitle {
      margin: 2px 0 0;
      font-size: 13px;
      color: #94a3b8;
    }

    .close-btn {
      position: absolute;
      right: 16px;
      top: 16px;
      color: #94a3b8;
    }

    .dialog-content {
      padding: 24px;
      background: var(--bg-light);
      max-height: 55vh;
      overflow-y: auto;
    }

    .form-section {
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }

    .selection-grid, .range-grid, .time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: flex-end; }
    .time-grid { grid-template-columns: 1fr 1fr 1.2fr; margin-top: 16px; }
    .full-width { grid-column: span 2; }

    .filter-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 4px;

      .p-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-left: 4px;
      }

      .label-with-action {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        
        .p-label { 
          margin: 0 !important; 
          display: inline-block;
          line-height: normal;
        }

        .config-btn { 
          width: 24px !important; 
          height: 24px !important; 
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #94a3b8;
          mat-icon { 
            font-size: 16px !important; 
            width: 16px !important; 
            height: 16px !important; 
            margin: 0 !important;
          }
          &:hover { color: #3b82f6; }
        }
      }
    }

    .premium-pill-btn {
      height: 48px !important;
      background: white !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
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

      &.has-selection {
        background: #f0f9ff !important;
        border-color: #3b82f6 !important;
      }
    }

    ::ng-deep .premium-selector-menu {
      border-radius: 14px !important;
      margin-top: 8px !important;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
      min-width: 220px !important;

      &.multi-menu {
        padding: 0;
        .menu-actions {
          padding: 8px;
          display: flex;
          justify-content: space-between;
          button { font-size: 11px; font-weight: 700; height: 32px; border-radius: 8px; }
        }
        .scrollable-menu-items {
          max-height: 280px;
          overflow-y: auto;
        }
      }

      .mat-mdc-menu-item {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #475569 !important;
        height: 48px !important;
        
        mat-icon { color: #94a3b8; }
        .chk-container { display: flex; align-items: center; gap: 12px; }
        .chk-icon { 
          font-size: 22px; width: 22px; height: 22px; color: #cbd5e1;
          &.is-checked { color: #3b82f6; }
        }
        .chk-label { font-weight: 600; font-size: 13px; color: #475569; }

        &.active-item {
          background: #eff6ff !important;
          color: #2563eb !important;
          mat-icon { color: #3b82f6; }
        }
      }
    }

    /* CUSTOM SELECTORS */
    .custom-days-selector {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      padding: 0 4px;
    }

    .day-chip {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 2px solid #e2e8f0;
      color: #64748b;
      font-weight: 800;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;

      &:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
      }

      &.selected {
        background: #2563eb;
        border-color: #2563eb;
        color: white !important;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        transform: translateY(-2px);
      }
    }

    .custom-type-selector {
      display: flex;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 14px;
      gap: 4px;
      margin: 16px 0;
    }

    .type-option {
      flex: 1;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 11px;
      color: #64748b;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;

      &:hover {
        color: #1e293b;
      }

      &.active {
        background: white;
        color: #2563eb;
        box-shadow: 0 4px 10px rgba(0,0,0,0.06);
      }
    }

    .dialog-actions {
      padding: 20px 24px;
      background: white;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .summary-card {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 14px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
    }

    .summary-icon {
      width: 32px;
      height: 32px;
      background: white;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #3b82f6;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .summary-text {
      font-size: 13px;
      color: #1e40af;
      line-height: 1.4;
      strong { font-size: 15px; color: #1d4ed8; }
    }

    .button-group { display: flex; gap: 12px; }

    .cancel-btn { font-weight: 600; color: #64748b; }

    .submit-btn {
      background: var(--primary) !important;
      color: white !important;
      padding: 0 24px;
      height: 44px;
      font-weight: 700;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }

    .spacer { flex: 1; }
    .mat-mdc-form-field-subscript-wrapper { display: none; }
  `]
})
export class ProgramarTurnosDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly turnosService = inject(TurnosService);
  private readonly grupoService = inject(GrupoService);
  private readonly preajustesService = inject(PreajustesService);
  private readonly dialog = inject(MatDialog);

  readonly empleados = signal<Empleado[]>([]);
  readonly grupos = signal<Grupo[]>([]);
  readonly presets = signal<PreajusteTurno[]>([]);
  readonly loading = signal(false);
  readonly totalRegistros = signal(0);

  form = this.fb.nonNullable.group({
    grupo_id: [''],
    empleado_ids: [[] as string[], [Validators.required, Validators.minLength(1)]],
    rango: this.fb.group({
      start: [null as DateTime | null, Validators.required],
      end: [null as DateTime | null, Validators.required]
    }),
    dias_semana: [[1, 2, 3, 4, 5] as number[], [Validators.required, Validators.minLength(1)]],
    tipo: ['turno' as TipoTurno, Validators.required],
    hora_inicio: ['08:00', Validators.required],
    hora_fin: ['17:00', Validators.required],
    sobrescribir: [false]
  }, { validators: this.validarRangoHoras });

  constructor(
    public dialogRef: MatDialogRef<ProgramarTurnosDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProgramarTurnosData
  ) {
    if (data?.empleados) {
      this.empleados.set(data.empleados);
    }
  }

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarPreajustes();
    this.form.valueChanges.subscribe(() => this.calcularTotal());
  }

  cargarPreajustes(): void {
    this.preajustesService.getAll().subscribe({
      next: (data) => this.presets.set(data),
      error: () => console.error('Error cargando preajustes')
    });
  }

  openGestionPreajustes(): void {
    const dRef = this.dialog.open(GestionPreajustesDialogComponent, {
      width: '450px'
    });
    dRef.afterClosed().subscribe(() => {
      this.cargarPreajustes();
    });
  }

  cargarGrupos(): void {
    this.grupoService.getAll().subscribe({
      next: (resp) => this.grupos.set(resp.data || []),
      error: () => this.snackBar.open('Error cargando grupos', 'Cerrar', { duration: 3000 })
    });
  }

  onGroupChange(groupId: string): void {
    this.form.get('grupo_id')?.setValue(groupId);
    if (!groupId) {
      this.empleados.set(this.data.empleados);
      return;
    }
    const filtrados = this.data.empleados.filter(e => e.grupo_id === groupId);
    this.empleados.set(filtrados);
    this.form.get('empleado_ids')?.setValue([]);
  }

  getSelectedGrupoName(): string {
    const id = this.form.get('grupo_id')?.value;
    if (!id) return 'Todos los Grupos';
    return this.grupos().find(g => g.id === id)?.nombre || 'Grupo';
  }

  isEmpleadoSelected(id: string): boolean {
    return this.form.get('empleado_ids')?.value?.includes(id) || false;
  }

  toggleEmpleadoSelection(empId: string): void {
    const control = this.form.get('empleado_ids');
    const current = control?.value || [];
    const newVal = current.includes(empId) 
      ? current.filter((id: string) => id !== empId)
      : [...current, empId];
    
    control?.setValue(newVal);
    this.form.updateValueAndValidity();
  }

  selectAllEmps(): void {
    this.form.get('empleado_ids')?.setValue(this.empleados().map(e => e.id));
  }

  isDaySelected(day: number): boolean {
    const seleccionados = this.form.get('dias_semana')?.value || [];
    return seleccionados.includes(day);
  }

  toggleDay(day: number): void {
    const control = this.form.get('dias_semana');
    const current = control?.value || [];
    if (current.includes(day)) {
      control?.setValue(current.filter(d => d !== day));
    } else {
      control?.setValue([...current, day]);
    }
  }

  setTipo(tipo: string): void {
    this.form.get('tipo')?.setValue(tipo as TipoTurno);
  }

  activePresetLabel = '';
  getSelectedPresetLabel(): string {
    return this.activePresetLabel || 'Personalizado';
  }

  onPresetChange(value: string | null, label?: string): void {
    if (!value) {
      this.activePresetLabel = '';
      return;
    }
    const [start, end] = value.split('-');
    this.form.patchValue({ hora_inicio: start, hora_fin: end });
    
    if (label) {
      this.activePresetLabel = label;
    } else {
      // Formatear label am/pm si no viene nombre
      const format = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'pm' : 'am';
        const h12 = h % 12 || 12;
        return `${h12}:${m < 10 ? '0'+m : m}${ampm}`;
      };
      this.activePresetLabel = `${format(start)} - ${format(end)}`;
    }
  }

  calcularTotal(): void {
    const { empleado_ids, rango, dias_semana } = this.form.getRawValue();
    if (!empleado_ids?.length || !rango?.start || !rango?.end || !dias_semana?.length) {
      this.totalRegistros.set(0);
      return;
    }

    let count = 0;
    const startObj = (rango.start instanceof DateTime) ? rango.start : DateTime.fromJSDate(rango.start);
    const endObj = (rango.end instanceof DateTime) ? rango.end : DateTime.fromJSDate(rango.end);
    
    let current = startObj.startOf('day');
    const end = endObj.startOf('day');

    while (current <= end) {
      if (dias_semana.includes(current.weekday)) {
        count += empleado_ids.length;
      }
      current = current.plus({ days: 1 });
    }
    this.totalRegistros.set(count);
  }

  validarRangoHoras(control: AbstractControl): ValidationErrors | null {
    const tipo = control.get('tipo')?.value;
    if (tipo !== 'turno') return null;

    const inicio = control.get('hora_inicio')?.value;
    const fin = control.get('hora_fin')?.value;
    
    if (!inicio || !fin) return null;

    // Permitido cruce de medianoche
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    
    this.loading.set(true);
    const values = this.form.getRawValue();
    
    const parseDate = (d: any) => {
      if (!d) return null;
      return (d instanceof DateTime) ? d.toISODate() : DateTime.fromJSDate(d).toISODate();
    };

    const dto: ProgramacionMasivaDto = {
      empleado_ids: values.empleado_ids,
      fecha_inicio: parseDate(values.rango.start)!,
      fecha_fin: parseDate(values.rango.end)!,
      dias_semana: values.dias_semana,
      tipo: values.tipo as TipoTurno,
      hora_inicio: values.tipo === 'turno' ? values.hora_inicio : '00:00',
      hora_fin: values.tipo === 'turno' ? values.hora_fin : '23:59',
      sobrescribir: values.sobrescribir
    };

    this.turnosService.programacionMasiva(dto).subscribe({
      next: () => {
        this.snackBar.open('Programación exitosa', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const msg = err.status === 409 ? 'Existen conflictos de turnos' : 'Error al programar turnos';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loading.set(false)
    });
  }
}
