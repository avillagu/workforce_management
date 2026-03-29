import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'programacion',
        loadComponent: () => import('./features/programacion/pages/programacion/programacion.component').then(m => m.ProgramacionComponent)
      },
      {
        path: 'operacion',
        loadComponent: () => import('./features/operacion/pages/operacion/operacion.component').then(m => m.OperacionComponent)
      },
      {
        path: 'novedades',
        loadComponent: () => import('./features/novedades/pages/novedades/novedades.component').then(m => m.NovedadesComponent)
      },
      {
        path: 'asistencias',
        loadComponent: () => import('./features/asistencias/pages/asistencias/asistencias.component').then(m => m.AsistenciasComponent)
      },
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];
