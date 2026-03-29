import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-perfil-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <mat-icon>manage_accounts</mat-icon>
        <h2>Configuración de Perfil</h2>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="user-summary-card">
        <div class="avatar-large">{{ authService.userName().charAt(0) }}</div>
        <div class="user-details">
          <h3>{{ authService.userName() }}</h3>
          <p>&#64;{{ authService.userLogin() }}</p>
          <span class="role-badge">{{ authService.userRole() | titlecase }}</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="dialog-content">
        <h3>Cambiar Contraseña</h3>
        <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Contraseña Actual</mat-label>
            <input matInput [type]="hideCurrent() ? 'password' : 'text'" formControlName="currentPassword">
            <button mat-icon-button matSuffix (click)="hideCurrent.set(!hideCurrent())" type="button">
              <mat-icon>{{ hideCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nueva Contraseña</mat-label>
            <input matInput [type]="hideNew() ? 'password' : 'text'" formControlName="newPassword">
            <button mat-icon-button matSuffix (click)="hideNew.set(!hideNew())" type="button">
              <mat-icon>{{ hideNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>Mínimo 6 caracteres</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Confirmar Nueva Contraseña</mat-label>
            <input matInput [type]="hideConfirm() ? 'password' : 'text'" formControlName="confirmPassword">
            <button mat-icon-button matSuffix (click)="hideConfirm.set(!hideConfirm())" type="button">
              <mat-icon>{{ hideConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <div class="form-actions">
            <button mat-button type="button" (click)="dialogRef.close()">Cancelar</button>
            <button 
              mat-flat-button 
              color="primary" 
              type="submit" 
              [disabled]="passwordForm.invalid || isLoading()"
            >
              {{ isLoading() ? 'Guardando...' : 'Actualizar Contraseña' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 0;
      max-width: 500px;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      
      mat-icon { color: #3b82f6; }
      h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
      .close-btn { margin-left: auto; }
    }
    .user-summary-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      
      .avatar-large {
        width: 64px;
        height: 64px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 700;
      }
      
      .user-details {
        h3 { margin: 0; font-size: 18px; color: #1e293b; }
        p { margin: 2px 0; color: #64748b; font-size: 14px; }
        .role-badge {
          display: inline-block;
          padding: 2px 10px;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 4px;
        }
      }
    }
    .dialog-content {
      padding: 24px;
      h3 { margin: 0 0 20px 0; font-size: 16px; color: #334155; }
    }
    .w-full { width: 100%; margin-bottom: 8px; }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      
      button { border-radius: 8px; padding: 0 24px; }
    }
  `]
})
export class PerfilDialogComponent {
  dialogRef = inject(MatDialogRef<PerfilDialogComponent>);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  hideCurrent = signal(true);
  hideNew = signal(true);
  hideConfirm = signal(true);

  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: any) {
    return g.get('newPassword').value === g.get('confirmPassword').value
      ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.passwordForm.invalid) return;

    this.isLoading.set(true);
    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword!, newPassword!).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.snackBar.open('Contraseña actualizada exitosamente', 'Cerrar', { duration: 3000 });
          this.dialogRef.close();
        } else {
          this.snackBar.open(res.error || 'Error al actualizar contraseña', 'Cerrar', { duration: 3000 });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open('Error de conexión con el servidor', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
