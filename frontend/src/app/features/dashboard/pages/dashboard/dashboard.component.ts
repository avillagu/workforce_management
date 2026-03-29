import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { DashboardService, DashboardStats } from '@core/services/dashboard.service';
import { AuthService } from '@core/services/auth.service'; // Nuevo import
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService); // Inyectar auth
  private router = inject(Router);
  
  isLoading = signal(true);
  stats = signal<any[]>([]);

  // Determinar si el usuario tiene permisos para navegar al detalle
  isAdminOrSupervisor = computed(() => {
    const role = this.authService.userRole();
    return role === 'admin' || role === 'supervisor';
  });

  ngOnInit(): void {
    this.cargarStats();
  }

  cargarStats(): void {
    this.isLoading.set(true);
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats.set([
          { title: 'Empleados Totales', value: data.total_empleados.toString(), icon: 'people', color: '#1e3a8a', bg: '#eff6ff', route: '/operacion' },
          { title: 'Activos Ahora', value: data.empleados_activos.toString(), icon: 'online_prediction', color: '#22c55e', bg: '#f0fdf4', route: '/asistencias' },
          { title: 'Novedades Pendientes', value: data.novedades_pendientes.toString(), icon: 'notifications_active', color: '#f59e0b', bg: '#fffbeb', route: '/novedades' }
        ]);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  irADetalle(route: string): void {
    this.router.navigate([route]);
  }
}
