import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Grupo, GrupoCreate, GrupoUpdate } from '@core/models/operacion.models';

export interface GrupoDialogData {
  grupo?: Grupo;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-grupo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <div class="header-icon-container">
          <mat-icon class="header-icon">{{ data.mode === 'create' ? 'groups' : 'edit' }}</mat-icon>
        </div>
        <h2 mat-dialog-title>
          {{ data.mode === 'create' ? 'Nuevo Grupo' : 'Editar Grupo' }}
        </h2>
        <button mat-icon-button mat-dialog-close class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-dialog-content>
          <div class="form-content">
            <!-- Nombre -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre del Grupo</mat-label>
              <input 
                matInput 
                formControlName="nombre" 
                placeholder="Ej: Equipo de Ventas"
                autocomplete="off"
              />
              <mat-icon matPrefix>groups</mat-icon>
              @if (form.get('nombre')?.hasError('required')) {
                <mat-error>El nombre es obligatorio</mat-error>
              }
              @if (form.get('nombre')?.hasError('minlength')) {
                <mat-error>El nombre debe tener al menos 3 caracteres</mat-error>
              }
            </mat-form-field>

            <!-- Descripción -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Descripción</mat-label>
              <textarea 
                matInput 
                formControlName="descripcion" 
                placeholder="Describe el propósito de este grupo..."
                rows="4"
              ></textarea>
              <mat-icon matPrefix>description</mat-icon>
              @if (form.get('descripcion')?.hasError('maxlength')) {
                <mat-error>La descripción no puede exceder los 500 caracteres</mat-error>
              }
            </mat-form-field>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" mat-dialog-close>Cancelar</button>
          <button 
            mat-flat-button 
            color="primary" 
            type="submit"
            [disabled]="form.invalid || loading"
          >
            @if (loading) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
            }
            {{ data.mode === 'create' ? 'Crear' : 'Guardar' }}
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 480px;
      max-width: 560px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      background: var(--sidebar-bg); // Mismo que Sidebar
      color: #fff;
      margin: -24px -24px 24px -24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);

      .header-icon-container {
        width: 40px;
        height: 40px;
        background: rgba(96, 165, 250, 0.1);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(96, 165, 250, 0.2);
      }

      .header-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #60a5fa; // Azul brillante
      }

      h2 {
        flex: 1;
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        color: #ffffff !important;
        letter-spacing: 0.5px;
      }

      .close-btn {
        color: rgba(255, 255, 255, 0.8);

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 8px 0;
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      font-size: 15px;
    }

    textarea {
      resize: vertical;
      min-height: 80px;
    }

    .activo-toggle {
      padding: 8px 0;
      margin-top: 8px;

      .toggle-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 500;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      gap: 12px;
      border-top: 1px solid #f1f5f9;

      button[mat-button] {
        color: #64748b;
        font-weight: 600;
      }

      button[mat-flat-button] {
        min-width: 140px;
        height: 44px;
        border-radius: 999px;
        background-color: #3b82f6 !important;
        color: white !important;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);

        &:hover {
          background-color: #2563eb !important;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        mat-icon {
          color: white !important;
          font-size: 20px;
          width: 20px;
          height: 20px;
          margin-right: 4px;
        }
      }
    }
  `]
})
export class GrupoDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<GrupoDialogComponent>);
  data = inject<GrupoDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  loading = false;

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]]
    });

    if (this.data.mode === 'edit' && this.data.grupo) {
      this.form.patchValue({
        nombre: this.data.grupo.nombre,
        descripcion: this.data.grupo.descripcion || ''
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.form.getRawValue();

    const result: GrupoCreate | GrupoUpdate = {
      nombre: formValue.nombre.trim(),
      descripcion: formValue.descripcion ? formValue.descripcion.trim() : null
    };

    this.dialogRef.close(result);
  }
}
