import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '@core/services/auth.service';
import { UiService } from '@core/services/ui.service';
import { ToastContainerComponent } from '../toast-container/toast-container.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PerfilDialogComponent } from '../perfil-dialog/perfil-dialog.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule,
    ToastContainerComponent,
    MatDialogModule
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  private uiService = inject(UiService) as UiService;
  private authService = inject(AuthService) as AuthService;
  private router = inject(Router);
  private dialog = inject(MatDialog); // Inyectar MatDialog

  userName = this.authService.userName;
  userLogin = this.authService.userLogin;
  userRole = this.authService.userRole;
  userGroup = this.authService.userGroup;
  isSidebarExpanded = this.uiService.isSidebarExpanded;
  pageTitle = signal<string>('Workforce Management');

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updatePageTitle(event.urlAfterRedirects);
      });

    // Set initial title
    this.updatePageTitle(this.router.url);
  }

  abrirPerfil(): void {
    this.dialog.open(PerfilDialogComponent, {
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'perfil-dialog-panel'
    });
  }

  private updatePageTitle(url: string): void {
    const routeTitles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/programacion': 'Programación',
      '/operacion': 'Operación',
      '/novedades': 'Novedades',
      '/asistencias': 'Asistencias'
    };

    // Find matching route
    for (const [route, title] of Object.entries(routeTitles)) {
      if (url.startsWith(route)) {
        this.pageTitle.set(title);
        return;
      }
    }

    this.pageTitle.set('Workforce Management');
  }

  logout(): void {
    this.authService.logout();
  }
}
