import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '@core/services/auth.service';
import { MenuItem } from '@core/models/auth.models';
import { UiService } from '@core/services/ui.service';
import { SolicitudesService } from '@core/services/solicitudes.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private solicitudesService = inject(SolicitudesService);

  // Signal sincronizado con el servicio UI
  isExpanded = this.uiService.isSidebarExpanded;
  
  // Datos del usuario y menú desde el servicio
  // Recibe estados de usuario y menú
  menu = this.authService.menu;
  userName = this.authService.userName;
  userRole = this.authService.userRole;
  novedadesCount = this.solicitudesService.countPendientes;

  /**
   * Manejadores de eventos de Mouse (Desactivados por petición del usuario)
   */
  onMouseEnter(): void {
    // Desactivado: El usuario prefiere control manual
  }

  onMouseLeave(): void {
    // Desactivado: El usuario prefiere control manual
  }

  /**
   * Alterna el estado del sidebar manualmente mediante el botón
   */
  toggle(): void {
    this.uiService.toggleSidebar();
  }

  /**
   * Obtiene el icono Material para cada item del menú
   */
  getMenuIcon(iconName: string): string {
    const iconMap: { [key: string]: string } = {
      'dashboard': 'dashboard',
      'calendar': 'calendar_today',
      'operations': 'hub',
      'notifications': 'notifications_active',
      'attendance': 'badge',
      'monitoring': 'monitor_heart'
    };
    return iconMap[iconName] || 'circle';
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    this.authService.logout();
  }
}
