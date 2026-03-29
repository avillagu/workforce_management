import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PreajustesService } from '../../../core/services/preajustes.service';
import { PreajusteTurno } from '../../../core/models/preajuste.model';

@Component({
  selector: 'app-gestion-preajustes-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  template: `
    <div class="premium-dialog">
      <div class="dialog-header">
        <div class="header-title">
          <mat-icon>settings_suggest</mat-icon>
          <h2>Gestionar Preajustes</h2>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <!-- Listado de Preajustes -->
        <div class="presets-list">
          <div *ngIf="loading()" class="loading-state">Cargando...</div>
          
          <div *ngFor="let p of presets()" class="preset-item">
            <div class="preset-info">
              <mat-icon>{{ p.icono || 'schedule' }}</mat-icon>
              <div class="preset-text">
                <span class="preset-name">{{ p.nombre }}</span>
                <span class="preset-times">{{ p.hora_inicio }} - {{ p.hora_fin }}</span>
              </div>
            </div>
            <div class="preset-actions">
              <button mat-icon-button color="primary" (click)="editPreset(p)" matTooltip="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deletePreset(p.id)" matTooltip="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
          
          <div *ngIf="!loading() && presets().length === 0" class="empty-state">
            No hay preajustes configurados.
          </div>
        </div>

        <mat-divider style="margin: 20px 0;"></mat-divider>

        <!-- Formulario (Nuevo/Editar) -->
        <div class="preset-form">
          <h3 style="margin-bottom: 20px;">{{ editingId() ? 'Editar Preajuste' : 'Nuevo Preajuste' }}</h3>
          <form [formGroup]="form" class="form-grid">
            <div class="times-row">
              <mat-form-field appearance="outline">
                <mat-label>Hora Inicio</mat-label>
                <input matInput type="time" formControlName="hora_inicio">
              </mat-form-field>
              
              <mat-form-field appearance="outline">
                <mat-label>Hora Fin</mat-label>
                <input matInput type="time" formControlName="hora_fin">
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-button *ngIf="editingId()" (click)="cancelEdit()">Cancelar</button>
              <button mat-flat-button color="primary" [disabled]="form.invalid || saving()" (click)="savePreset()">
                <mat-icon>{{ editingId() ? 'save' : 'add' }}</mat-icon>
                {{ editingId() ? 'Guardar Cambios' : 'Crear Preajuste' }}
              </button>
            </div>
          </form>
        </div>
      </mat-dialog-content>
    </div>
  `,
  styles: [`
    .premium-dialog { 
      padding: 0;
      --primary: #2563eb;
    }
    .dialog-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      border-bottom: 1px solid #f1f5f9;
      .header-title {
        display: flex;
        align-items: center;
        gap: 12px;
        h2 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
        mat-icon { color: var(--primary); }
      }
    }
    .dialog-content { padding: 24px; max-height: 70vh; }
    
    .presets-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .preset-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
      &:hover { border-color: var(--primary); background: #f1f5f9; }
    }
    .preset-info {
      display: flex;
      align-items: center;
      gap: 12px;
      mat-icon { color: #64748b; font-size: 20px; width: 20px; height: 20px; }
      .preset-text {
        display: flex;
        flex-direction: column;
        .preset-name { font-weight: 700; color: #1e293b; font-size: 14px; }
        .preset-times { font-size: 12px; color: #64748b; }
      }
    }
    .preset-form {
      h3 { margin: 0 0 16px 0; font-size: 14px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    }
    .times-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full-width { width: 100%; }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .loading-state, .empty-state { padding: 40px; text-align: center; color: #94a3b8; font-size: 14px; }
  `]
})
export class GestionPreajustesDialogComponent implements OnInit {
  protected readonly dialogRef = inject(MatDialogRef<GestionPreajustesDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly preajustesService = inject(PreajustesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly presets = signal<PreajusteTurno[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    nombre: [''],
    hora_inicio: ['08:00', [Validators.required]],
    hora_fin: ['17:00', [Validators.required]],
    icono: ['schedule']
  });

  ngOnInit(): void {
    this.loadPresets();
  }

  loadPresets(): void {
    this.loading.set(true);
    this.preajustesService.getAll().subscribe({
      next: (data) => this.presets.set(data),
      error: () => this.snackBar.open('Error al cargar preajustes', 'Cerrar', { duration: 3000 }),
      complete: () => this.loading.set(false)
    });
  }

  editPreset(p: PreajusteTurno): void {
    this.editingId.set(p.id);
    this.form.patchValue({
      nombre: p.nombre,
      hora_inicio: p.hora_inicio,
      hora_fin: p.hora_fin,
      icono: p.icono
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ hora_inicio: '08:00', hora_fin: '17:00', icono: 'schedule' });
  }

  savePreset(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    
    // Generar nombre automático
    const start = this.form.get('hora_inicio')?.value;
    const end = this.form.get('hora_fin')?.value;
    const formatLabel = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'pm' : 'am';
      const h12 = h % 12 || 12;
      return `${h12}:${m < 10 ? '0'+m : m}${ampm}`;
    };
    const nombreGen = `${formatLabel(start)} - ${formatLabel(end)}`;
    this.form.patchValue({ nombre: nombreGen });

    const id = this.editingId();
    const data = this.form.value;
    
    const obs$ = id 
      ? this.preajustesService.update(id, data)
      : this.preajustesService.create(data);

    obs$.subscribe({
      next: () => {
        this.snackBar.open(id ? 'Preajuste actualizado' : 'Preajuste creado', 'Cerrar', { duration: 2000 });
        this.cancelEdit();
        this.loadPresets();
      },
      error: () => this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 }),
      complete: () => this.saving.set(false)
    });
  }

  deletePreset(id: string): void {
    this.preajustesService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Preajuste eliminado', 'Cerrar', { duration: 2000 });
        this.loadPresets();
      },
      error: () => this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 })
    });
  }
}
