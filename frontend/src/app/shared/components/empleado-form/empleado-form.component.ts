import { Component, inject, signal, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Grupo, Empleado, EmpleadoCreate, EmpleadoUpdate } from '@core/models/operacion.models';
import { ToastService } from '@shared/services/toast.service';

export interface EmpleadoDialogData {
  grupos: Grupo[];
  empleado?: Empleado | null;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="empleado-dialog-container">
      <div class="dialog-header-mapo">
        <div class="header-icon-container">
          <mat-icon>{{ data.mode === 'create' ? 'person_add' : 'edit_note' }}</mat-icon>
        </div>
        <div class="header-text-group">
          <h2>{{ data.mode === 'create' ? 'Matricular Nuevo Empleado' : 'Editar Información' }}</h2>
          <p>{{ data.mode === 'create' ? 'Asigne sus credenciales y grupo de trabajo' : 'Identificación: ' + data.empleado?.username }}</p>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn-dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content-body">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="empleado-form">
          <div class="form-grid-layout">
            <!-- Nombre Completo -->
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>
                <mat-icon>badge</mat-icon>
                Nombre Completo
                <span class="required">*</span>
              </mat-label>
              <input 
                matInput 
                formControlName="nombre_completo" 
                placeholder="Ej: Juan Pérez García"
                autocomplete="name"
              />
              @if (form.get('nombre_completo')?.hasError('required')) {
                <mat-error>El nombre completo es obligatorio</mat-error>
              }
              @if (form.get('nombre_completo')?.hasError('minlength')) {
                <mat-error>El nombre debe tener al menos 5 caracteres</mat-error>
              }
              @if (form.get('nombre_completo')?.hasError('pattern')) {
                <mat-error>El nombre debe contener solo letras y espacios</mat-error>
              }
            </mat-form-field>

            <!-- Username -->
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>
                <mat-icon>person_outline</mat-icon>
                Usuario de Acceso
                <span class="required">*</span>
              </mat-label>
              <input 
                matInput 
                formControlName="username" 
                placeholder="Ej: jperez"
                autocomplete="username"
              />
              <mat-hint>Nombre de usuario para iniciar sesión</mat-hint>
              @if (form.get('username')?.hasError('required')) {
                <mat-error>El usuario es obligatorio</mat-error>
              }
              @if (form.get('username')?.hasError('minlength')) {
                <mat-error>El usuario debe tener al menos 4 caracteres</mat-error>
              }
              @if (form.get('username')?.hasError('pattern')) {
                <mat-error>El usuario solo puede contener letras, números y guiones bajos</mat-error>
              }
            </mat-form-field>

            <!-- Removed Email Field -->

            <!-- Contraseña -->
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>
                <mat-icon>lock</mat-icon>
                {{ data.mode === 'create' ? 'Contraseña Inicial' : 'Nueva Contraseña' }}
                @if (data.mode === 'create') {
                  <span class="required">*</span>
                }
              </mat-label>
              <input 
                matInput 
                [type]="hidePassword() ? 'password' : 'text'" 
                formControlName="password" 
                placeholder="Contraseña predeterminada"
                autocomplete="new-password"
              />
              <button 
                mat-icon-button 
                matSuffix 
                type="button"
                (click)="hidePassword.set(!hidePassword())"
                [attr.aria-label]="'Toggle password visibility'"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>{{ data.mode === 'create' ? 'El empleado deberá cambiarla en su primer acceso.' : 'Déjela vacía para mantener la contraseña actual.' }}</mat-hint>
              @if (form.get('password')?.hasError('required')) {
                <mat-error>La contraseña es obligatoria</mat-error>
              }
              @if (form.get('password')?.hasError('minlength')) {
                <mat-error>La contraseña debe tener al menos 6 caracteres</mat-error>
              }
              @if (form.get('password')?.hasError('weak')) {
                <mat-error>La contraseña debe incluir mayúsculas, minúsculas y números</mat-error>
              }
            </mat-form-field>

            <!-- Confirmar Contraseña -->
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>
                <mat-icon>lock_outline</mat-icon>
                Confirmar Contraseña
                @if (data.mode === 'create') {
                  <span class="required">*</span>
                }
              </mat-label>
              <input 
                matInput 
                [type]="hideConfirmPassword() ? 'password' : 'text'" 
                formControlName="confirmPassword" 
                placeholder="Repita la contraseña"
                autocomplete="new-password"
              />
              <button 
                mat-icon-button 
                matSuffix 
                type="button"
                (click)="hideConfirmPassword.set(!hideConfirmPassword())"
                [attr.aria-label]="'Toggle password visibility'"
              >
                <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('confirmPassword')?.hasError('required')) {
                <mat-error>Debe confirmar la contraseña</mat-error>
              }
              @if (form.get('confirmPassword')?.hasError('mustMatch')) {
                <mat-error>Las contraseñas no coinciden</mat-error>
              }
            </mat-form-field>

            <!-- Grupo -->
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>
                <mat-icon>group_work</mat-icon>
                Grupo
              </mat-label>
              <mat-select formControlName="grupo_id">
                <mat-option [value]="null">-- Sin Grupo Asignado --</mat-option>
                @for (grupo of data.grupos; track grupo.id) {
                  <mat-option [value]="grupo.id">{{ grupo.nombre }}</mat-option>
                }
              </mat-select>
              @if (form.get('grupo_id')?.hasError('required')) {
                <mat-error>Seleccione un grupo</mat-error>
              }
            </mat-form-field>

            <!-- Rol -->
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>
                <mat-icon>admin_panel_settings</mat-icon>
                Rol
              </mat-label>
              <mat-select formControlName="rol">
                <mat-option value="empleado">Empleado Operativo</mat-option>
                <mat-option value="supervisor">Supervisor de Canal</mat-option>
                <mat-option value="admin">Administrador del Sistema</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </form>
      </div>

      <div class="dialog-actions-footer">
        <button mat-button type="button" mat-dialog-close [disabled]="loading()">
          Cancelar
        </button>
        <button 
          mat-flat-button 
          color="primary" 
          type="button"
          (click)="onSubmit()"
          [disabled]="form.invalid || loading()"
        >
          @if (loading()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <mat-icon>{{ data.mode === 'create' ? 'how_to_reg' : 'save_as' }}</mat-icon>
            <span>{{ data.mode === 'create' ? 'Finalizar Matrícula' : 'Guardar Cambios' }}</span>
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .empleado-dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: white;
    }

    .dialog-header-mapo {
      padding: 24px 32px;
      background: var(--sidebar-bg);
      color: white;
      display: flex;
      align-items: center;
      gap: 20px;
      position: relative;
      border-bottom: 2px solid rgba(59, 130, 246, 0.3);

      .header-icon-container {
        width: 54px;
        height: 54px;
        background: rgba(59, 130, 246, 0.15);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(59, 130, 246, 0.3);
        
        mat-icon {
          font-size: 30px;
          width: 30px;
          height: 30px;
          color: #60a5fa;
        }
      }

      .header-text-group {
        h2 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 22px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }
        p {
          font-size: 13px;
          color: #94a3b8;
          margin: 4px 0 0 0;
          font-weight: 500;
        }
      }

      .close-btn-dialog {
        position: absolute;
        top: 12px;
        right: 12px;
        color: #94a3b8;
        &:hover { color: white; }
      }
    }

    .dialog-content-body {
      padding: 32px 40px;
      overflow-y: auto;
    }

    .form-grid-layout {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .dialog-actions-footer {
      padding: 24px 40px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 16px;

      button {
        height: 48px;
        border-radius: 12px;
        font-weight: 700;
        padding: 0 24px;
      }
    }
  `]
})
export class EmpleadoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private dialogRef = inject(MatDialogRef<EmpleadoFormComponent>);
  public data = inject<EmpleadoDialogData>(MAT_DIALOG_DATA);

  form!: FormGroup;
  loading = signal<boolean>(false);
  hidePassword = signal<boolean>(true);
  hideConfirmPassword = signal<boolean>(true);

  ngOnInit(): void {
    this.initForm();
    if (this.data.mode === 'edit' && this.data.empleado) {
      this.form.patchValue({
        nombre_completo: this.data.empleado.nombre_completo,
        username: this.data.empleado.username,
        grupo_id: this.data.empleado.grupo_id,
        rol: this.data.empleado.rol,
        password: '',
        confirmPassword: ''
      });
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      nombre_completo: ['', [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(150),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]],
      username: ['', [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9_.@-]+$/) // Relaxing pattern a bit
      ]],
      password: ['', []],
      confirmPassword: ['', []],
      grupo_id: [null as string | null, Validators.required],
      rol: ['empleado', Validators.required]
    });

    this.updateValidators();
  }

  private updateValidators() {
    if (!this.form) return;
    const pwdControl = this.form.get('password');
    const confirmControl = this.form.get('confirmPassword');
    
    if (this.data.mode === 'create') {
        pwdControl?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(50), this.passwordValidator.bind(this)]);
        confirmControl?.setValidators([Validators.required, this.confirmPasswordValidator.bind(this)]);
    } else {
        pwdControl?.setValidators([Validators.minLength(6), Validators.maxLength(50), this.passwordValidator.bind(this)]);
        confirmControl?.setValidators([this.confirmPasswordValidator.bind(this)]);
    }
    pwdControl?.updateValueAndValidity();
    confirmControl?.updateValueAndValidity();
  }

  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    
    const isValid = hasUpperCase && hasLowerCase && hasDigit;
    return isValid ? null : { weak: true };
  }

  private confirmPasswordValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) return null;
    
    const password = control.parent.get('password')?.value;
    const confirmPassword = control.value;
    
    if (!password || !confirmPassword) return null;
    
    return password === confirmPassword ? null : { mustMatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Removed toastService.warning as per diff
      return;
    }

    this.loading.set(true);

    const formValue = this.form.getRawValue();
    const empleadoData: any = {
      nombre_completo: formValue.nombre_completo.trim(),
      username: formValue.username.trim(),
      grupo_id: formValue.grupo_id,
      rol: formValue.rol
    };

    if (formValue.password) {
      empleadoData.password = formValue.password;
    }

    this.dialogRef.close(empleadoData);
  }

  onReset(): void {
    if (this.data.mode === 'edit' && this.data.empleado) {
      this.form.patchValue({
        nombre_completo: this.data.empleado.nombre_completo,
        username: this.data.empleado.username,
        grupo_id: this.data.empleado.grupo_id,
        rol: this.data.empleado.rol,
        password: '',
        confirmPassword: ''
      });
    } else {
      this.form.reset({
        nombre_completo: '',
        username: '',
        password: '',
        confirmPassword: '',
        grupo_id: null,
        rol: 'empleado'
      });
    }
    this.hidePassword.set(true);
    this.hideConfirmPassword.set(true);
  }
}
