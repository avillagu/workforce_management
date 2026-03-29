import { Component, Inject, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { Empleado, Grupo } from '@core/models/operacion.models';
import { TurnosService } from '@core/services/turnos.service';
import { GrupoService } from '@core/services/grupo.service';

export interface EliminarTurnosData {
  empleados: Empleado[];
}

@Component({
  selector: 'app-eliminar-turnos-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="premium-dialog delete-mode">
      <div class="dialog-header dark-header">
        <div class="icon-badge danger-badge">
          <mat-icon>delete_sweep</mat-icon>
        </div>
        <div class="header-info">
          <p class="eyebrow danger-text">LIMPIEZA DE PROGRAMACIÓN</p>
          <h2>Eliminar Turnos</h2>
          <p class="subtitle">Remueve registros masivamente según filtros</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn white-icon">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <div class="warning-banner">
          <mat-icon>warning</mat-icon>
          <span>Esta acción es irreversible y afectará los registros en el calendario.</span>
        </div>

        <form [formGroup]="form">
          <!-- Paso 1: Selección de Personal -->
          <section class="form-section">
            <h3 class="section-title"><mat-icon>group</mat-icon> Selección de Personal</h3>
            <div class="selection-grid">
              <div class="filter-wrapper">
                <label class="p-label danger-text">Filtro de Grupo</label>
                <button 
                  mat-flat-button 
                  type="button"
                  class="premium-pill-btn danger-pill" 
                  [matMenuTriggerFor]="delGrpMenu"
                >
                  <div class="pill-content">
                    <mat-icon class="pill-icon">groups</mat-icon>
                    <span class="pill-label">{{ getSelectedGrupoName() }}</span>
                    <mat-icon class="pill-chevron">expand_more</mat-icon>
                  </div>
                </button>

                <mat-menu #delGrpMenu="matMenu" class="premium-selector-menu">
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
                <label class="p-label danger-text">Seleccionar Empleados</label>
                <button 
                  mat-flat-button 
                  type="button"
                  class="premium-pill-btn danger-pill multi-select-pill" 
                  [matMenuTriggerFor]="delEmpMenu"
                  [class.has-selection]="(form.get('empleado_ids')?.value?.length || 0) > 0"
                >
                  <div class="pill-content">
                    <mat-icon class="pill-icon">person_remove</mat-icon>
                    <span class="pill-label">
                       {{ (form.get('empleado_ids')?.value?.length || 0) }} seleccionados
                    </span>
                    <mat-icon class="pill-chevron">expand_more</mat-icon>
                  </div>
                </button>

                <mat-menu #delEmpMenu="matMenu" class="premium-selector-menu multi-menu">
                  <div class="menu-actions" (click)="$event.stopPropagation()">
                    <button mat-button color="warn" (click)="selectAllEmps()">Todo el Grupo</button>
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
                <mat-label>Rango de fechas a limpiar*</mat-label>
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
                    class="day-chip danger-chip" 
                    [class.selected]="isDaySelected(d.v)"
                    (click)="toggleDay(d.v)">
                    {{ d.l }}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </form>
      </mat-dialog-content>

      <div class="dialog-actions">
        <div class="summary-card danger-summary" *ngIf="totalEstimado() > 0">
          <div class="summary-icon">
            <mat-icon>cleaning_services</mat-icon>
          </div>
          <div class="summary-text">
            Se afectarán aprox.<br>
            <strong>{{ totalEstimado() }} días/empleado</strong>
          </div>
        </div>

        <div class="spacer"></div>
        
        <div class="button-group">
          <button mat-button (click)="dialogRef.close()" class="cancel-btn">Cancelar</button>
          <button mat-flat-button 
                  class="delete-btn"
                  [disabled]="form.invalid || loading()"
                  (click)="onSubmit()">
            <mat-icon>delete_forever</mat-icon>
            {{ loading() ? 'Eliminando...' : 'Eliminar Turnos' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .premium-dialog {
      --primary: #2563eb;
      --danger: #ef4444;
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

    .icon-badge {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .danger-badge { background: linear-gradient(135deg, #ef4444, #f87171); shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }

    .header-info h2 { margin: 0; font-size: 20px; font-weight: 800; color: white; }
    .eyebrow { text-transform: uppercase; font-size: 10px; font-weight: 700; letter-spacing: 1px; margin: 0; }
    .danger-text { color: #f87171; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #94a3b8; }
    .white-icon { color: white !important; }

    .dialog-content { padding: 24px; background: var(--bg-light); max-height: 55vh; overflow-y: auto; }

    .warning-banner {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      color: #991b1b;
      font-size: 13px;
      font-weight: 500;
      mat-icon { color: #dc2626; font-size: 20px; width: 20px; height: 20px; }
    }

    .form-section {
      background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px;
      border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .section-title {
      font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 16px 0;
      display: flex; align-items: center; gap: 8px;
    }
    .section-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: #64748b; }

    .selection-grid, .range-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: flex-end; }
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
        &.danger-text { color: #f87171; }
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
        
        .pill-icon { color: #ef4444; font-size: 20px; width: 20px; height: 20px; }
        .pill-label { flex: 1; font-size: 14px; font-weight: 600; color: #1e293b; }
        .pill-chevron { color: #94a3b8; font-size: 20px; width: 20px; height: 20px; }
      }

      &:hover {
        border-color: #ef4444 !important;
        background: #fff1f2 !important;
      }

      &.has-selection {
        background: #fef2f2 !important;
        border-color: #ef4444 !important;
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
          &.is-checked { color: #ef4444; }
        }
        .chk-label { font-weight: 600; font-size: 13px; color: #475569; }

        &.active-item {
          background: #fff1f2 !important;
          color: #be123c !important;
          mat-icon { color: #ef4444; }
        }
      }
    }

    .custom-days-selector { display: flex; justify-content: space-between; margin-top: 12px; padding: 0 4px; }

    .day-chip {
      width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; background: white; border: 2px solid #e2e8f0;
      color: #64748b; font-weight: 800; font-size: 15px; cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); user-select: none;
    }

    .danger-chip.selected {
      background: #ef4444 !important; border-color: #ef4444 !important;
      color: white !important; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      transform: translateY(-2px);
    }

    .dialog-actions {
      padding: 20px 24px; background: white; border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 20px;
    }

    .danger-summary { background: #fff1f2 !important; border: 1px solid #ffe4e6 !important; }
    .danger-summary .summary-text { color: #9f1239 !important; }
    .danger-summary .summary-text strong { color: #e11d48 !important; }

    .summary-card {
      border-radius: 14px; padding: 8px 16px; display: flex; align-items: center; gap: 12px; min-width: 200px;
    }

    .summary-icon {
      width: 32px; height: 32px; background: white; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: #ef4444;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .button-group { display: flex; gap: 12px; }
    .cancel-btn { font-weight: 600; color: #64748b; }
    .delete-btn {
      background: #ef4444 !important; color: white !important; padding: 0 24px;
      height: 44px; font-weight: 700; border-radius: 12px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }
    .spacer { flex: 1; }
    .mat-mdc-form-field-subscript-wrapper { display: none; }
  `]
})
export class EliminarTurnosDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly turnosService = inject(TurnosService);
  private readonly grupoService = inject(GrupoService);

  readonly empleados = signal<Empleado[]>([]);
  readonly grupos = signal<Grupo[]>([]);
  readonly loading = signal(false);
  readonly totalEstimado = signal(0);

  form = this.fb.nonNullable.group({
    grupo_id: [''],
    empleado_ids: [[] as string[], [Validators.required, Validators.minLength(1)]],
    rango: this.fb.group({
      start: [null as DateTime | null, Validators.required],
      end: [null as DateTime | null, Validators.required]
    }),
    dias_semana: [[1, 2, 3, 4, 5] as number[], [Validators.required, Validators.minLength(1)]]
  });

  constructor(
    public dialogRef: MatDialogRef<EliminarTurnosDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EliminarTurnosData
  ) {
    if (data?.empleados) {
      this.empleados.set(data.empleados);
    }
  }

  ngOnInit(): void {
    this.cargarGrupos();
    this.form.valueChanges.subscribe(() => this.calcularTotal());
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

  calcularTotal(): void {
    const { empleado_ids, rango, dias_semana } = this.form.getRawValue();
    if (!empleado_ids?.length || !rango?.start || !rango?.end || !dias_semana?.length) {
      this.totalEstimado.set(0);
      return;
    }

    let count = 0;
    const startObj = (rango.start instanceof DateTime) ? rango.start : DateTime.fromJSDate(rango.start as any);
    const endObj = (rango.end instanceof DateTime) ? rango.end : DateTime.fromJSDate(rango.end as any);
    
    let current = startObj.startOf('day');
    const end = endObj.startOf('day');

    while (current <= end) {
      if (dias_semana.includes(current.weekday)) {
        count += empleado_ids.length;
      }
      current = current.plus({ days: 1 });
    }
    this.totalEstimado.set(count);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    
    this.loading.set(true);
    const values = this.form.getRawValue();
    
    const parseDate = (d: any) => {
      if (!d) return null;
      return (d instanceof DateTime) ? d.toISODate() : DateTime.fromJSDate(d).toISODate();
    };

    const dto = {
      empleado_ids: values.empleado_ids,
      fecha_inicio: parseDate(values.rango.start)!,
      fecha_fin: parseDate(values.rango.end)!,
      dias_semana: values.dias_semana
    };

    this.turnosService.eliminarTurnosMasivo(dto).subscribe({
      next: (resp) => {
        this.snackBar.open(resp.detalle || 'Turnos eliminados correctamente', 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.snackBar.open('Error al eliminar turnos', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loading.set(false)
    });
  }
}
