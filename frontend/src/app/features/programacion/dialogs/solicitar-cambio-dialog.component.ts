import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { DateTime } from 'luxon';
import { AuthService } from '@core/services/auth.service';
import { EmpleadoService } from '@core/services/empleado.service';
import { SolicitudesService } from '@core/services/solicitudes.service';
import { TurnosService } from '@core/services/turnos.service';
import { Empleado } from '@core/models/operacion.models';
import { Turno } from '@core/models/turno.model';

@Component({
  selector: 'app-solicitar-cambio-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSnackBarModule,
    MatMenuModule
  ],
  template: `
    <div class="premium-dialog">
      <div class="dialog-header accent-gradient">
        <div class="icon-badge">
          <mat-icon>swap_horizontal_circle</mat-icon>
        </div>
        <div class="header-info">
          <h2>Solicitar Cambio de Turno</h2>
          <p class="subtitle">Propón un intercambio con un compañero de tu grupo</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <form [formGroup]="form" class="request-form">
          <!-- Paso 1: Con quién -->
          <div class="form-section">
            <label class="p-label">1. ¿Con quién deseas cambiar?</label>
            <button 
              mat-flat-button 
              type="button"
              class="premium-pill-btn" 
              [matMenuTriggerFor]="empMenu"
            >
              <div class="pill-content">
                <mat-icon class="pill-icon">person</mat-icon>
                <span class="pill-label">{{ selectedEmpleado()?.nombre_completo || 'Seleccionar compañero...' }}</span>
                <mat-icon class="pill-chevron">expand_more</mat-icon>
              </div>
            </button>

            <mat-menu #empMenu="matMenu" class="premium-selector-menu">
              <button 
                mat-menu-item 
                *ngFor="let e of colegas()" 
                (click)="onEmpleadoSelect(e)"
              >
                <mat-icon>person_outline</mat-icon>
                <span>{{ e.nombre_completo }}</span>
              </button>
            </mat-menu>
          </div>

          <!-- Paso 2: Qué día -->
          <div class="form-section">
            <label class="p-label">2. ¿Qué día sería el cambio?</label>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fecha del cambio</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="fecha" readonly>
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Vista Previa -->
          <div class="preview-section" *ngIf="loadingPreview()">
             <div class="loading-preview">Buscando turnos...</div>
          </div>

          <div class="preview-section" *ngIf="!loadingPreview() && selectedEmpleado() && form.get('fecha')?.value">
            <h3 class="preview-title">Comparativa de Turnos</h3>
            <div class="comparison-grid">
              <div class="comp-card mine">
                <span class="card-tag">Tu Turno</span>
                <div class="card-content" *ngIf="miTurno(); else noMiTurno">
                  <span class="time" *ngIf="miTurno()?.tipo !== 'descanso'; else miDescanso">
                    {{ formatTime(miTurno()!.hora_inicio) }} - {{ formatTime(miTurno()!.hora_fin) }}
                  </span>
                  <ng-template #miDescanso>
                    <span class="no-shift">Descanso</span>
                  </ng-template>
                </div>
                <ng-template #noMiTurno>
                  <span class="no-shift">Sin turno (Libre)</span>
                </ng-template>
              </div>

              <div class="swap-icon">
                <mat-icon>swap_horiz</mat-icon>
              </div>

              <div class="comp-card target">
                <span class="card-tag">Turno de {{ selectedEmpleado()?.nombre_completo?.split(' ')?.at(0) }}</span>
                <div class="card-content" *ngIf="suTurno(); else noSuTurno">
                   <span class="time" *ngIf="suTurno()?.tipo !== 'descanso'; else suDescanso">
                     {{ formatTime(suTurno()?.hora_inicio) }} - {{ formatTime(suTurno()?.hora_fin) }}
                   </span>
                   <ng-template #suDescanso>
                     <span class="no-shift">Descanso</span>
                   </ng-template>
                </div>
                <ng-template #noSuTurno>
                  <span class="no-shift">Sin turno (Libre)</span>
                </ng-template>
              </div>
            </div>
            
            <p class="warning-text" *ngIf="!miTurno() && !suTurno()">
               <mat-icon>error_outline</mat-icon>
               No hay nada que cambiar este día.
            </p>
          </div>
        </form>
      </mat-dialog-content>

      <div class="dialog-actions">
        <button mat-button (click)="dialogRef.close()">Cancelar</button>
        <button 
          mat-flat-button 
          class="submit-btn"
          [disabled]="form.invalid || loading() || (!miTurno() && !suTurno())"
          (click)="onSubmit()"
        >
          <mat-icon>send</mat-icon>
          {{ loading() ? 'Enviando...' : 'Solicitar Cambio' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .premium-dialog { --primary: #7c3aed; padding: 0; }
    .accent-gradient { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); }
    .dialog-header { padding: 20px 24px; color: white; display: flex; align-items: center; gap: 16px; position: relative; }
    .icon-badge { width: 48px; height: 48px; border-radius: 14px; background: rgba(124, 58, 237, 0.2); display: flex; align-items: center; justify-content: center; mat-icon { font-size: 28px; width: 28px; height: 28px; color: #a182ff; } }
    .header-info h2 { margin: 0; font-size: 18px; font-weight: 800; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #94a3b8; }
    .close-btn { position: absolute; right: 16px; top: 16px; color: #94a3b8; }
    
    .dialog-content { padding: 24px; background: #f8fafc; }
    .form-section { margin-bottom: 24px; }
    .p-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px; }
    
    .premium-pill-btn {
      width: 100%; height: 50px !important; background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 12px !important;
      .pill-content { display: flex; align-items: center; gap: 12px; padding: 0 4px; }
      .pill-icon { color: var(--primary); }
      .pill-label { flex: 1; text-align: left; font-weight: 600; font-size: 14px; color: #1e293b; }
      .pill-chevron { color: #94a3b8; }
    }

    .preview-section { background: white; border-radius: 16px; padding: 16px; border: 1px solid #e2e8f0; }
    .preview-title { font-size: 13px; font-weight: 800; color: #1e293b; margin: 0 0 16px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .comparison-grid { display: flex; align-items: center; gap: 12px; }
    .comp-card { flex: 1; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; }
    .card-tag { font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; color: #64748b; }
    .mine { background: #f0f9ff; border: 1px solid #bae6fd; .time { color: #0369a1; font-weight: 800; } }
    .target { background: #f5f3ff; border: 1px solid #ddd6fe; .time { color: #5b21b6; font-weight: 800; } }
    .no-shift { font-size: 12px; color: #94a3b8; font-style: italic; }
    .swap-icon { color: #94a3b8; }
    .warning-text { display: flex; align-items: center; gap: 6px; color: #ef4444; font-size: 12px; font-weight: 700; margin-top: 12px; mat-icon { font-size: 16px; width: 16px; height: 16px; } }

    .dialog-actions { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
    .submit-btn { background: var(--primary) !important; color: white !important; border-radius: 12px; font-weight: 700; gap: 8px; }
    .full-width { width: 100%; }
  `]
})
export class SolicitarCambioDialogComponent implements OnInit {
  protected readonly dialogRef = inject(MatDialogRef<SolicitarCambioDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly turnosService = inject(TurnosService);

  readonly colegas = signal<Empleado[]>([]);
  readonly selectedEmpleado = signal<Empleado | null>(null);
  readonly miTurno = signal<Turno | null>(null);
  readonly suTurno = signal<Turno | null>(null);
  readonly loading = signal(false);
  readonly loadingPreview = signal(false);

  form = this.fb.group({
    fecha: [null as Date | null, Validators.required],
    objetivo_id: ['', Validators.required]
  });

  ngOnInit(): void {
    this.loadColegas();
    this.form.valueChanges.subscribe(() => this.updatePreview());
  }

  loadColegas(): void {
    const user = this.authService.user();
    if (!user?.grupo_id) return;

    this.empleadoService.getAll().subscribe({
      next: (resp) => {
        const emps = resp.data || [];
        // Filtrar por mismo grupo y que no sea yo mismo
        this.colegas.set(emps.filter(e => e.grupo_id === user.grupo_id && e.id !== user.id));
      }
    });
  }

  onEmpleadoSelect(e: Empleado): void {
    this.selectedEmpleado.set(e);
    this.form.get('objetivo_id')?.setValue(e.id);
  }

  updatePreview(): void {
    const { fecha, objetivo_id } = this.form.value;
    const miId = this.authService.user()?.id;
    if (!fecha || !objetivo_id || !miId) return;

    const fechaStr = DateTime.fromJSDate(fecha).toISODate()!;
    this.loadingPreview.set(true);

    // Buscar turnos para ese día para ambos
    this.turnosService.getTurnos(fechaStr, fechaStr).subscribe({
      next: (turnos) => {
        this.miTurno.set(turnos.find(t => t.usuario_id === miId) || null);
        this.suTurno.set(turnos.find(t => t.usuario_id === objetivo_id) || null);
        this.loadingPreview.set(false);
      },
      error: () => this.loadingPreview.set(false)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    const { objetivo_id, fecha } = this.form.value;
    const fechaStr = DateTime.fromJSDate(fecha!).toISODate()!;

    this.solicitudesService.crearSolicitud(objetivo_id!, fechaStr).subscribe({
      next: () => {
        this.snackBar.open('Solicitud enviada exitosamente', 'Cerrar', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.snackBar.open(err.error?.error || 'Error al enviar solicitud', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loading.set(false)
    });
  }
  formatTime(iso?: string): string {
    if (!iso) return '--:--';
    return DateTime.fromISO(iso, { zone: 'utc' }).toFormat('HH:mm');
  }
}
