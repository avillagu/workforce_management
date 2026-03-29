import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DateTime } from 'luxon';
import { SolicitudesService } from '@core/services/solicitudes.service';
import { AuthService } from '@core/services/auth.service';
import { SolicitudCambio } from '@core/models/solicitud.model';
import { Notificacion } from '@core/models/notificacion.model';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatChipsModule, 
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="novedades-container">
      <header class="page-header">
        <div class="header-content">
          <mat-icon class="header-icon">notifications_active</mat-icon>
          <div>
            <h1>Notificaciones y Novedades</h1>
            <p>Gestiona tus solicitudes de cambio y avisos del sistema</p>
          </div>
        </div>
      </header>

      <div class="content-grid">
        <section class="request-section">
          <h2 class="section-title">Avisos del Sistema</h2>
          <div *ngIf="!loading() && notificaciones().length === 0" class="empty-state-small">
            <p>No hay avisos nuevos.</p>
          </div>
          <div class="notifs-list">
            <div *ngFor="let n of notificaciones()" class="notif-item" [class.unread]="!n.leido" (click)="marcarComoLeida(n)">
              <mat-icon [color]="n.tipo === 'publicacion_turnos' ? 'primary' : ''">
                {{ n.tipo === 'publicacion_turnos' ? 'calendar_month' : 'notifications' }}
              </mat-icon>
              <div class="notif-content">
                <p class="notif-msg">{{ n.mensaje }}</p>
                <span class="notif-date">{{ formatDate(n.created_at) }}</span>
              </div>
              <div *ngIf="!n.leido" class="unread-dot"></div>
            </div>
          </div>

          <h2 class="section-title mt-4">Cambios de Turno Pendientes</h2>
          
          <div *ngIf="loading()" class="loading-state">
            <mat-icon class="spin">sync</mat-icon>
            <p>Cargando novedades...</p>
          </div>

          <div *ngIf="!loading() && solicitudes().length === 0" class="empty-state">
            <mat-icon>inbox</mat-icon>
            <p>No tienes solicitudes de cambio pendientes.</p>
          </div>

          <div class="requests-list">
            <mat-card *ngFor="let s of solicitudes()" class="request-card" [class.finalized]="s.estado_final !== 'abierta'">
              <div class="card-header">
                <span class="date-badge">{{ formatDate(s.fecha) }}</span>
                <span class="status-pill" [class]="s.estado_final">
                  {{ s.estado_final === 'abierta' ? 'En Proceso' : (s.estado_final === 'aprobada' ? 'Completado' : 'Rechazado') }}
                </span>
              </div>

              <div class="card-body">
                <div class="swap-comparison">
                  <div class="emp-side">
                    <span class="emp-name">{{ s.solicitante_id === userId() ? 'Tú (Solicitante)' : s.solicitante_nombre }}</span>
                    <div class="shift-pill" *ngIf="s.hora_inicio_solicitante">
                       {{ formatTime(s.hora_inicio_solicitante) }} - {{ formatTime(s.hora_fin_solicitante) }}
                    </div>
                    <div class="shift-pill none" *ngIf="!s.hora_inicio_solicitante">Libre</div>
                  </div>

                  <mat-icon class="swap-icon">swap_horiz</mat-icon>

                  <div class="emp-side">
                    <span class="emp-name">{{ s.objetivo_id === userId() ? 'Tú (compañero)' : s.objetivo_nombre }}</span>
                    <div class="shift-pill target" *ngIf="s.hora_inicio_objetivo">
                       {{ formatTime(s.hora_inicio_objetivo) }} - {{ formatTime(s.hora_fin_objetivo) }}
                    </div>
                    <div class="shift-pill none" *ngIf="!s.hora_inicio_objetivo">Libre</div>
                  </div>
                </div>

                <div class="approval-tracker">
                  <div class="step" [class.done]="s.estado_objetivo === 'aprobado'" [class.error]="s.estado_objetivo === 'rechazado'">
                    <mat-icon>{{ s.estado_objetivo === 'aprobado' ? 'check_circle' : (s.estado_objetivo === 'rechazado' ? 'cancel' : 'radio_button_unchecked') }}</mat-icon>
                    <span>Compañero</span>
                  </div>
                  <div class="line"></div>
                  <div class="step" [class.done]="s.estado_admin === 'aprobado'" [class.error]="s.estado_admin === 'rechazado'">
                    <mat-icon>{{ s.estado_admin === 'aprobado' ? 'check_circle' : (s.estado_admin === 'rechazado' ? 'cancel' : 'radio_button_unchecked') }}</mat-icon>
                    <span>Administrador</span>
                  </div>
                </div>
              </div>

              <mat-divider></mat-divider>

              <div class="card-actions" *ngIf="canIProcess(s)">
                <button mat-button color="warn" (click)="procesar(s.id, 'rechazado')">Rechazar</button>
                <button mat-flat-button color="primary" (click)="procesar(s.id, 'aprobado')">Aprobar Cambio</button>
              </div>

              <div class="card-footer" *ngIf="!canIProcess(s) && s.estado_final === 'abierta'">
                <p class="wait-msg">
                   <mat-icon>hourglass_empty</mat-icon>
                   Esperando respuesta de {{ whoAreWeWaitingFor(s) }}
                </p>
              </div>
            </mat-card>
          </div>
        </section>

        <aside class="info-aside">
          <mat-card class="help-card">
            <h3>¿Cómo funcionan los cambios?</h3>
            <ul class="help-list">
              <li>El compañero implicado debe aceptar primero.</li>
              <li>Luego, el administrador debe dar el visto bueno final.</li>
              <li>Una vez ambos acepten, los turnos se intercambian automáticamente en el calendario.</li>
            </ul>
          </mat-card>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .novedades-container { padding: 32px; animation: fadeIn 0.4s ease-out; }
    .page-header { margin-bottom: 32px; .header-content { display: flex; align-items: center; gap: 20px; } .header-icon { font-size: 40px; width: 40px; height: 40px; color: #7c3aed; } h1 { margin: 0; font-size: 28px; font-weight: 800; color: #1e293b; } p { margin: 4px 0 0; color: #64748b; font-size: 15px; } }
    
    .content-grid { display: grid; grid-template-columns: 1fr 320px; gap: 32px; }
    .section-title { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 24px; }
    
    .requests-list { display: grid; grid-template-columns: 1fr; gap: 20px; }
    .request-card {
      border-radius: 16px; border: 1px solid #e2e8f0; transition: transform 0.2s;
      &.finalized { opacity: 0.8; background: #f8fafc; }
      .card-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
      .date-badge { background: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
      .status-pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
      .status-pill.abierta { background: #fef3c7; color: #92400e; }
      .status-pill.aprobada { background: #dcfce7; color: #166534; }
      .status-pill.rechazada { background: #fee2e2; color: #991b1b; }
    }

    .card-body { padding: 20px; }
    .swap-comparison { display: flex; align-items: center; justify-content: space-around; margin-bottom: 24px; }
    .emp-side { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
    .emp-name { font-size: 13px; font-weight: 700; color: #475569; text-align: center; }
    .shift-pill { background: #f0f9ff; color: #0369a1; padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 14px; &.target { background: #f5f3ff; color: #5b21b6; } &.none { background: #f1f5f9; color: #94a3b8; font-weight: 500; } }
    .swap-icon { color: #cbd5e1; }

    .approval-tracker { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .step {
      display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #94a3b8;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &.done { color: #166534; mat-icon { color: #22c55e; } }
      &.error { color: #991b1b; mat-icon { color: #ef4444; } }
    }
    .line { width: 40px; height: 2px; background: #e2e8f0; }

    .card-actions { padding: 12px 20px; display: flex; justify-content: flex-end; gap: 12px; }
    .card-footer { padding: 12px 20px; .wait-msg { margin: 0; font-size: 12px; color: #64748b; font-style: italic; display: flex; align-items: center; gap: 6px; mat-icon { font-size: 16px; width: 16px; height: 16px; } } }

    .help-card { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); h3 { font-size: 16px; font-weight: 800; margin: 0 0 16px 0; color: #a182ff; } .help-list { margin: 0; padding-left: 20px; li { font-size: 13px; margin-bottom: 12px; line-height: 1.5; opacity: 0.95; } } }
    
    .mt-4 { margin-top: 32px; }
    .notifs-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .notif-item { 
       display: flex; align-items: center; gap: 16px; padding: 12px 16px; 
       background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; cursor: pointer;
       transition: all 0.2s; position: relative;
       &:hover { transform: translateX(5px); border-color: #7c3aed; }
       &.unread { background: #fdf4ff; border-color: #d8b4fe; }
       mat-icon { font-size: 20px; width: 20px; height: 20px; color: #64748b; }
    }
    .notif-content { flex: 1; .notif-msg { margin: 0; font-size: 13px; font-weight: 700; color: #1e293b; } .notif-date { font-size: 11px; color: #94a3b8; } }
    .unread-dot { width: 8px; height: 8px; background: #7c3aed; border-radius: 50%; }
    .empty-state-small { padding: 20px; color: #94a3b8; font-size: 13px; font-style: italic; }

    .loading-state, .empty-state { padding: 64px; text-align: center; color: #94a3b8; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; } .spin { animation: rotate 2s linear infinite; } }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class NovedadesComponent implements OnInit {
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly solicitudes = signal<SolicitudCambio[]>([]);
  readonly notificaciones = signal<Notificacion[]>([]);
  readonly loading = signal(false);
  readonly userId = signal<string>('');
  readonly userRole = signal<string>('');

  ngOnInit(): void {
    this.userId.set(this.authService.user()?.id || '');
    this.userRole.set(this.authService.user()?.rol || '');
    this.loadSolicitudes();
  }

  loadSolicitudes(): void {
    this.loading.set(true);
    this.solicitudesService.getAllVisible().subscribe({
      next: (list: SolicitudCambio[]) => this.solicitudes.set(list),
      error: () => this.snackBar.open('Error al cargar solicitudes', 'Cerrar', { duration: 3000 }),
      complete: () => {
         // Cargar notificaciones también
         this.loadNotificaciones();
      }
    });
  }

  loadNotificaciones(): void {
    this.solicitudesService.getNotificaciones().subscribe({
      next: (list) => this.notificaciones.set(list),
      complete: () => this.loading.set(false)
    });
  }

  canIProcess(s: SolicitudCambio): boolean {
    if (s.estado_final !== 'abierta') return false;
    
    // Objetivo puede aprobar si está pendiente su parte
    if (this.userId() === s.objetivo_id && s.estado_objetivo === 'pendiente') return true;
    
    // Admin puede aprobar si está pendiente su parte
    if (this.userRole() === 'admin' && s.estado_admin === 'pendiente') return true;

    return false;
  }

  whoAreWeWaitingFor(s: SolicitudCambio): string {
    const waiting = [];
    if (s.estado_objetivo === 'pendiente') waiting.push('el compañero');
    if (s.estado_admin === 'pendiente') waiting.push('el administrador');
    return waiting.join(' y ');
  }

  procesar(id: string, decision: 'aprobado' | 'rechazado'): void {
    this.solicitudesService.procesar(id, decision).subscribe({
      next: () => {
        this.snackBar.open(decision === 'aprobado' ? 'Cambio aprobado' : 'Cambio rechazado', 'Cerrar', { duration: 3000 });
        this.loadSolicitudes();
      },
      error: (err: any) => this.snackBar.open(err.error?.error || 'Error al procesar', 'Cerrar', { duration: 4000 })
    });
  }

  marcarComoLeida(n: Notificacion): void {
    if (n.leido) return;
    this.solicitudesService.marcarLeida(n.id).subscribe({
      next: () => {
        this.loadNotificaciones();
      }
    });
  }

  formatDate(f: string): string {
    return DateTime.fromISO(f).setLocale('es').toFormat('EEEE, d LLL');
  }

  formatTime(iso?: string): string {
    if (!iso) return '--:--';
    return DateTime.fromISO(iso, { zone: 'utc' }).toFormat('HH:mm');
  }
}
