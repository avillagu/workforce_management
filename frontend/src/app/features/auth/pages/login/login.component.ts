import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService) as AuthService;
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Signals para el estado del formulario
  username = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  // returnUrl para redirección después del login
  returnUrl: string = '/dashboard';

  constructor() {
    // Obtener returnUrl de los query params si existe
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  /**
   * Maneja el envío del formulario de login
   */
  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    // Validaciones básicas
    if (!this.username() || !this.password()) {
      this.errorMessage.set('Por favor ingrese usuario y contraseña');
      this.isLoading.set(false);
      return;
    }

    try {
      const success = await this.authService.login({
        username: this.username(),
        password: this.password()
      });

      if (success) {
        // Cargar menú y redirigir
        await this.authService.loadMenu();
        this.router.navigate([this.returnUrl]);
      }
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  /**
   * Limpia el mensaje de error cuando el usuario empieza a escribir
   */
  onInput(): void {
    if (this.errorMessage()) {
      this.errorMessage.set(null);
    }
  }
}
