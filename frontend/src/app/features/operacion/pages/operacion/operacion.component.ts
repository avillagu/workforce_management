import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GrupoService } from '@core/services/grupo.service';
import { EmpleadoService } from '@core/services/empleado.service';
import { ToastService } from '@shared/services/toast.service';
import { Grupo, Empleado, GrupoCreate, GrupoUpdate, EmpleadoCreate, EmpleadoUpdate } from '@core/models/operacion.models';
import { GrupoCardComponent } from '@shared/components/grupo-card/grupo-card.component';
import { GrupoDialogComponent } from '@shared/components/grupo-dialog/grupo-dialog.component';
import { EmpleadoFormComponent } from '@shared/components/empleado-form/empleado-form.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-operacion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDialogModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatTableModule,
    MatMenuModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    GrupoCardComponent,
    GrupoDialogComponent,
    EmpleadoFormComponent,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="operacion-container fade-in">
      <!-- Loading Overlay -->
      @if (loading()) {
        <app-loading-spinner [overlay]="true" [diameter]="50" message="Cargando..."></app-loading-spinner>
      }

      <!-- Tabs Navigation -->
      <mat-card class="operacion-card">
        <mat-tab-group 
          [(selectedIndex)]="selectedTabIndex" 
          class="operacion-tabs"
          dynamicHeight
          animationDuration="300ms"
        >
          <!-- Tab 1: Grupos -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">workspaces</mat-icon>
              <span class="tab-label">Grupos</span>
            </ng-template>

            <div class="tab-content">
              <!-- Header -->
              <div class="tab-header">
                <div class="header-info">
                  <mat-icon>folder</mat-icon>
                  <div>
                    <h2>Gestión de Grupos</h2>
                    <p>Administre los grupos de trabajo de su organización</p>
                  </div>
                </div>
                <button 
                  mat-flat-button 
                  color="primary" 
                  (click)="openGrupoDialog('create')"
                  class="btn-add"
                >
                  <mat-icon>add</mat-icon>
                  Nuevo Grupo
                </button>
              </div>

              <mat-divider></mat-divider>

              <!-- Groups Grid -->
              <div class="grupos-content">
                @if (loadingGrupos()) {
                  <div class="loading-state">
                    <app-loading-spinner [diameter]="40" message="Cargando grupos..."></app-loading-spinner>
                  </div>
                } @else if (grupos().length === 0) {
                  <div class="empty-state">
                    <mat-icon class="empty-icon">folder_off</mat-icon>
                    <h3>No hay grupos registrados</h3>
                    <p>Comience creando su primer grupo de trabajo</p>
                    <button mat-flat-button color="primary" (click)="openGrupoDialog('create')">
                      <mat-icon>add</mat-icon>
                      Crear Grupo
                    </button>
                  </div>
                } @else {
                  <div class="grupos-grid">
                    @for (grupo of grupos(); track grupo.id) {
                      <app-grupo-card 
                        [grupo]="grupo" 
                        (edit)="openGrupoDialog('edit', $event)"
                        (delete)="confirmDeleteGrupo($event)"
                      ></app-grupo-card>
                    }
                  </div>
                }
              </div>
            </div>
          </mat-tab>

          <!-- Tab 2: Empleados -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">person</mat-icon>
              <span class="tab-label">Empleados</span>
            </ng-template>

            <div class="tab-content">
              <!-- Header -->
              <div class="tab-header">
                <div class="header-info">
                  <mat-icon>badge</mat-icon>
                  <div>
                    <h2>Gestión de Personal</h2>
                    <p>Administre la nómina de empleados y sus asignaciones</p>
                  </div>
                </div>
                
                <div class="header-right-actions">
                  <button 
                    mat-flat-button 
                    color="primary"
                    (click)="openEmpleadoDialog('create')"
                    class="btn-add-mapo"
                  >
                    <mat-icon>person_add</mat-icon>
                    Matricular Empleado
                  </button>

                  <!-- Cápsulas Modernas de Herramientas -->
                  <div class="header-tools-tray">
                    <!-- Premium Group Filter -->
                    <button 
                      mat-flat-button 
                      class="premium-pill-btn" 
                      [matMenuTriggerFor]="operacionGroupMenu"
                    >
                      <div class="pill-content">
                        <mat-icon class="pill-icon">groups</mat-icon>
                        <span class="pill-label">{{ getSelectedGrupoName() }}</span>
                        <mat-icon class="pill-chevron">expand_more</mat-icon>
                      </div>
                    </button>

                    <mat-menu #operacionGroupMenu="matMenu" class="premium-selector-menu">
                      <button mat-menu-item (click)="onFilterChange('ALL')" [class.active-item]="filtroGrupo() === 'ALL'">
                        <mat-icon>all_inclusive</mat-icon>
                        <span>Todo el Personal</span>
                      </button>
                      <mat-divider></mat-divider>
                      @for (grupo of grupos(); track grupo.id) {
                        <button 
                          mat-menu-item 
                          (click)="onFilterChange(grupo.id)"
                          [class.active-item]="filtroGrupo() === grupo.id"
                        >
                          <mat-icon>group_work</mat-icon>
                          <span>{{ grupo.nombre }}</span>
                        </button>
                      }
                    </mat-menu>

                    <div class="pill-box search-box-mapo">
                      <mat-icon>search</mat-icon>
                      <input 
                        type="text" 
                        placeholder="Buscar analista..." 
                        [value]="filtroTexto()"
                        (input)="onSearchInput($event)"
                      >
                    </div>
                  </div>
                </div>
              </div>

              <mat-divider></mat-divider>

              <div class="empleados-content">
                @if (loadingEmpleados()) {
                  <div class="loading-state">
                    <app-loading-spinner [diameter]="40" message="Cargando empleados..."></app-loading-spinner>
                  </div>
                } @else if (empleadosFiltrados().length === 0) {
                  @if (true) {
                    <div class="empty-state">
                      <mat-icon class="empty-icon">person_off</mat-icon>
                      <h3>No hay empleados registrados</h3>
                      <p>Comience matriculando a su primer analista</p>
                      <button mat-flat-button color="primary" (click)="openEmpleadoDialog('create')">
                        <mat-icon>person_add</mat-icon>
                        Matricular Ahora
                      </button>
                    </div>
                  }
                } @else {
                  <mat-card class="table-card">
                    <table mat-table [dataSource]="empleadosFiltrados()" class="w-full">
                      <!-- Name Column -->
                      <ng-container matColumnDef="nombre">
                        <th mat-header-cell *matHeaderCellDef> Nombre Completo </th>
                        <td mat-cell *matCellDef="let emp"> 
                          <div class="emp-name-cell">
                            <span class="avatar">{{ emp.nombre_completo.charAt(0) }}</span>
                            {{ emp.nombre_completo }} 
                          </div>
                        </td>
                      </ng-container>

                      <!-- Username Column -->
                      <ng-container matColumnDef="username">
                        <th mat-header-cell *matHeaderCellDef> Usuario </th>
                        <td mat-cell *matCellDef="let emp"> 
                          <code class="username-tag">{{ emp.username }}</code>
                        </td>
                      </ng-container>

                      <!-- Group Column -->
                      <ng-container matColumnDef="grupo">
                        <th mat-header-cell *matHeaderCellDef> Grupo </th>
                        <td mat-cell *matCellDef="let emp">
                          <mat-chip-set>
                            <mat-chip [color]="emp.grupo_nombre ? 'primary' : 'default'">
                              {{ emp.grupo_nombre || 'Sin Grupo' }}
                            </mat-chip>
                          </mat-chip-set>
                        </td>
                      </ng-container>

                      <!-- Actions Column -->
                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef aria-label="row actions">&nbsp;</th>
                        <td mat-cell *matCellDef="let emp" class="text-right">
                          <button mat-icon-button [matMenuTriggerFor]="menu" matTooltip="Opciones">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                          <mat-menu #menu="matMenu">
                            <button mat-menu-item (click)="openEmpleadoDialog('edit', emp)">
                              <mat-icon>edit</mat-icon>
                              <span>Editar</span>
                            </button>
                            <button mat-menu-item (click)="confirmDeleteEmpleado(emp)">
                              <mat-icon>delete</mat-icon>
                              <span>Eliminar</span>
                            </button>
                          </mat-menu>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                    </table>
                  </mat-card>
                }
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styles: [`
    .operacion-container {
      position: relative;
      min-height: calc(100vh - 180px);
      animation: fadeIn 0.4s ease-out;
    }

    .operacion-card {
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .operacion-tabs {
      ::ng-deep {
        .mat-mdc-tab-header {
          background: var(--sidebar-bg); // Mismo color exacto que el sidebar
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 0 16px;
          border-radius: 12px 12px 0 0;
          
          .mat-mdc-tab {
            min-width: 160px;
            height: 56px;
            
            .mdc-tab__text-label {
              color: rgba(255, 255, 255, 0.6);
            }
            .mat-icon {
              color: rgba(255, 255, 255, 0.6);
            }
            
            &.mdc-tab--active {
              .mdc-tab__text-label {
                color: #ffffff;
                font-weight: 600;
              }
              .mat-icon {
                color: #60a5fa; // Azul brillante para el icono activo
              }
            }
            
            &:not(.mdc-tab--active):hover {
              background: rgba(59, 130, 246, 0.08); // Azul muy tenue
              .mdc-tab__text-label {
                color: #ffffff;
              }
              .mat-icon {
                color: #60a5fa; // Azul brillante suave
              }
            }
          }

          .mat-mdc-tab-body-wrapper {
            color: rgba(255, 255, 255, 0.7);
          }

          .mat-ink-bar {
            background: #3b82f6; // Azul en la barra indicadora
            height: 3px;
          }
        }

        .mat-mdc-tab-body-content {
          padding: 0;
        }
      }
    }

    .tab-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .tab-label {
      font-size: 15px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }


    .tab-content {
      padding: 32px;
      background: var(--background-color);
      min-height: 500px;
    }

    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      .header-info {
        display: flex;
        align-items: center;
        gap: 16px;

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          padding: 8px;
          border-radius: 12px;
        }

        h2 {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: var(--primary-color);
          margin: 0;
          letter-spacing: -0.5px;
        }

        p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 4px 0 0 0;
        }
      }

      .header-right-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }

      .btn-add-mapo {
        border-radius: 999px; // Botón más moderno estilo DeskTime
        padding: 0 24px;
        font-weight: 600;
        height: 44px;
        background-color: #3b82f6 !important; // Azul brillante exacto
        color: white;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        transition: all 0.3s ease;
        &:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }
      }

      .header-tools-tray {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
        &.hidden { display: none; }

        .pill-box {
          height: 42px;
          background: var(--muted-surface);
          border: 1px solid var(--border-color);
          border-radius: 40px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          transition: all 0.2s ease;
          
          mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); margin-right: 10px; }

          &:focus-within {
            background: var(--surface-color);
            border-color: var(--primary-strong);
            box-shadow: var(--shadow-sm);
          }
        }

        .search-box-mapo {
          width: 240px;
          input {
            border: none;
            background: transparent;
            outline: none;
            width: 100%;
            font-size: 14px;
            color: var(--primary-strong);
            font-weight: 500;
            &::placeholder { color: var(--text-secondary); font-weight: 400; }
          }
        }

        .premium-pill-btn {
          height: 42px !important;
          background: white !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 40px !important;
          padding: 0 16px !important;
          transition: all 0.2s ease;
          
          &:hover {
            background: #f8fafc !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }

          .pill-content {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: center;
            
            .pill-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
              color: #3b82f6;
            }

            .pill-label {
              font-size: 13px;
              font-weight: 700;
              color: var(--primary-strong);
              letter-spacing: -0.2px;
            }

            .pill-chevron {
              font-size: 18px;
              width: 18px;
              height: 18px;
              color: var(--text-secondary);
            }
          }
        }
      }

      .btn-add {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        font-weight: 600;
        text-transform: none;
        border-radius: 999px;
        background-color: #3b82f6 !important;
        color: white;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);

        &:hover {
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
          transform: translateY(-1px);
        }
      }
    }

    .grupos-content {
      margin-top: 24px;
    }

    .grupos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #bdbdbd;
        margin-bottom: 24px;
      }

      h3 {
        font-size: 18px;
        font-weight: 600;
        color: #424242;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 14px;
        color: #9e9e9e;
        margin: 0 0 24px 0;
      }
    }

    .empleados-content {
      margin-top: 24px;
    }

    .empleado-form-section {
      margin: 24px 0;
      padding: 16px;
      background: var(--surface-color);
      border-radius: 16px;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-color);
    }

    .table-card {
      border-radius: 16px;
      overflow: hidden;
      margin-top: 16px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
    }

    table {
      width: 100%;
      background: white;

      th {
        background: var(--muted-surface);
        color: var(--primary-strong);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.05em;
        height: 56px;
      }

      td {
        height: 64px;
      }
    }

    .emp-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      color: #333;

      .avatar {
        width: 34px;
        height: 34px;
        background: var(--primary-bright);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 2px 5px rgba(59, 130, 246, 0.2);
      }
    }

    .username-tag {
      background: var(--muted-surface);
      color: var(--primary-bright);
      padding: 4px 10px;
      border-radius: 999px;
      font-family: inherit;
      font-weight: 500;
      font-size: 12px;
      border: 1px solid var(--border-color);
    }

    .text-right { text-align: right; }
    .w-full { width: 100%; }

    ::ng-deep .premium-selector-menu {
      border-radius: 14px !important;
      margin-top: 8px !important;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
      min-width: 200px !important;

      .mat-mdc-menu-item {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #475569 !important;
        
        mat-icon {
          color: #94a3b8;
        }

        &.active-item {
          background: #eff6ff !important;
          color: #2563eb !important;
          mat-icon { color: #3b82f6; }
        }
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class OperacionComponent implements OnInit {
  private grupoService = inject(GrupoService);
  private empleadoService = inject(EmpleadoService);
  private dialog = inject(MatDialog);
  public toastService = inject(ToastService);

  grupos = signal<Grupo[]>([]);
  empleados = signal<Empleado[]>([]);
  loading = signal<boolean>(false);
  loadingGrupos = signal<boolean>(false);
  loadingEmpleados = signal<boolean>(false);
  selectedTabIndex = 0;
  filtroGrupo = signal<string>('ALL');
  filtroTexto = signal<string>('');

  empleadosFiltrados = computed(() => {
    let list = this.empleados();
    const grupo = this.filtroGrupo();
    const texto = this.filtroTexto().toLowerCase().trim();

    // Filtro por Grupo
    if (grupo !== 'ALL') {
      list = list.filter(e => e.grupo_id === grupo);
    }

    // Filtro por Texto (Nombre o Usuario)
    if (texto) {
      list = list.filter(e => 
        e.nombre_completo.toLowerCase().includes(texto) || 
        e.username.toLowerCase().includes(texto)
      );
    }

    return list;
  });

  displayedColumns: string[] = ['nombre', 'username', 'grupo', 'actions'];

  ngOnInit(): void {
    this.loadGrupos();
    this.loadEmpleados();
  }

  onFilterChange(grupoId: any): void {
    // Si grupoId es null (deseleccionado), volvemos a ALL
    this.filtroGrupo.set(grupoId || 'ALL');
  }

  getSelectedGrupoName(): string {
    const id = this.filtroGrupo();
    if (id === 'ALL' || !id) return 'Todo el Personal';
    return this.grupos().find(g => g.id === id)?.nombre || 'Filtrar';
  }

  onSearchInput(event: any): void {
    const value = (event.target as HTMLInputElement).value;
    this.filtroTexto.set(value);
  }

  loadEmpleados(): void {
    this.loadingEmpleados.set(true);
    this.empleadoService.getAll().subscribe({
      next: (response) => {
        this.loadingEmpleados.set(false);
        if (response.success) {
          this.empleados.set(response.data);
        } else {
          this.toastService.error(response.error || 'Error al cargar empleados');
        }
      },
      error: () => {
        this.loadingEmpleados.set(false);
        this.toastService.error('Error de conexión al cargar empleados');
      }
    });
  }

  loadGrupos(): void {
    this.loadingGrupos.set(true);
    this.grupoService.getAll().subscribe({
      next: (response) => {
        this.loadingGrupos.set(false);
        if (response.success) {
          this.grupos.set(response.data);
        } else {
          this.toastService.error(response.error || 'Error al cargar grupos');
        }
      },
      error: (error) => {
        this.loadingGrupos.set(false);
        this.toastService.error('Error de conexión al cargar grupos');
      }
    });
  }

  openGrupoDialog(mode: 'create' | 'edit', grupo?: Grupo): void {
    const dialogRef = this.dialog.open(GrupoDialogComponent, {
      data: { mode, grupo },
      width: '560px',
      disableClose: false,
      panelClass: 'grupo-dialog-overlay'
    });

    dialogRef.afterClosed().subscribe((result: GrupoCreate | GrupoUpdate | undefined) => {
      if (result) {
        if (mode === 'create') {
          this.createGrupo(result as GrupoCreate);
        } else if (grupo) {
          this.updateGrupo(grupo.id, result as GrupoUpdate);
        }
      }
    });
  }

  createGrupo(grupoData: GrupoCreate): void {
    this.loading.set(true);
    this.grupoService.create(grupoData).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.toastService.success('Grupo creado exitosamente');
          this.loadGrupos();
        } else {
          this.toastService.error(response.error || 'Error al crear grupo');
        }
      },
      error: (error) => {
        this.loading.set(false);
        const errorMessage = error.error?.message || 'Error de conexión al crear grupo';
        this.toastService.error(errorMessage);
      }
    });
  }

  updateGrupo(id: string, grupoData: GrupoUpdate): void {
    this.loading.set(true);
    this.grupoService.update(id, grupoData).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.toastService.success('Grupo actualizado exitosamente');
          this.loadGrupos();
        } else {
          this.toastService.error(response.error || 'Error al actualizar grupo');
        }
      },
      error: (error) => {
        this.loading.set(false);
        const errorMessage = error.error?.message || 'Error de conexión al actualizar grupo';
        this.toastService.error(errorMessage);
      }
    });
  }

  confirmDeleteGrupo(grupo: Grupo): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { nombre: grupo.nombre, tipo: 'grupo' },
      width: '420px',
      panelClass: 'confirm-dialog-overlay'
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deleteGrupo(grupo.id);
      }
    });
  }

  deleteGrupo(id: string): void {
    this.loading.set(true);
    this.grupoService.delete(id).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success) {
          this.toastService.success('Grupo eliminado exitosamente');
          this.loadGrupos();
        } else {
          this.toastService.error(response.error || 'Error al eliminar grupo');
        }
      },
      error: (error) => {
        this.loading.set(false);
        const errorMessage = error.error?.message || 'Error de conexión al eliminar grupo';
        this.toastService.error(errorMessage);
      }
    });
  }

  openEmpleadoDialog(mode: 'create' | 'edit', empleado?: Empleado): void {
    const dialogRef = this.dialog.open(EmpleadoFormComponent, {
      width: '850px',
      data: { 
        grupos: this.grupos(), 
        empleado, 
        mode 
      },
      panelClass: 'custom-dialog-container',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (mode === 'create') {
          this.createEmpleado(result);
        } else if (empleado) {
          this.updateEmpleado(empleado.id, result);
        }
      }
    });
  }

  createEmpleado(data: EmpleadoCreate): void {
    this.loadingEmpleados.set(true);
    this.empleadoService.create(data).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Empleado matriculado exitosamente');
          this.loadEmpleados();
        } else {
          this.loadingEmpleados.set(false);
          this.toastService.error(response.error || 'Error al matricular empleado');
        }
      },
      error: (error) => {
        this.loadingEmpleados.set(false);
        this.toastService.error(error.error?.message || 'Error de conexión');
      }
    });
  }

  updateEmpleado(id: string, data: EmpleadoUpdate): void {
    this.loadingEmpleados.set(true);
    this.empleadoService.update(id, data).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Empleado actualizado exitosamente');
          this.loadEmpleados();
        } else {
          this.loadingEmpleados.set(false);
          this.toastService.error(response.error || 'Error al actualizar empleado');
        }
      },
      error: (error) => {
        this.loadingEmpleados.set(false);
        this.toastService.error(error.error?.message || 'Error de conexión');
      }
    });
  }

  confirmDeleteEmpleado(emp: Empleado): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { nombre: emp.nombre_completo, tipo: 'empleado' },
      width: '420px',
      panelClass: 'confirm-dialog-overlay'
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deleteEmpleado(emp.id);
      }
    });
  }

  deleteEmpleado(id: string): void {
    this.loadingEmpleados.set(true);
    this.empleadoService.delete(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Empleado eliminado exitosamente');
          this.loadEmpleados();
        } else {
          this.loadingEmpleados.set(false);
          this.toastService.error(response.error || 'Error al eliminar empleado');
        }
      },
      error: (error) => {
        this.loadingEmpleados.set(false);
        this.toastService.error(error.error?.message || 'Error de conexión');
      }
    });
  }
}

/**
 * Simple confirmation dialog component for delete operations
 */
@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-icon">
        <mat-icon>warning</mat-icon>
      </div>
      <h2 mat-dialog-title>¿Eliminar {{ data.tipo === 'grupo' ? 'Grupo' : 'Empleado' }}?</h2>
      <mat-dialog-content>
        <p>¿Está seguro que desea eliminar {{ data.tipo === 'grupo' ? 'el grupo' : 'el empleado' }} <strong>"{{ data.nombre }}"</strong>?</p>
        <p class="warning-text">Esta acción no se puede deshacer.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="warn" [mat-dialog-close]="true">
          <mat-icon>delete</mat-icon>
          Eliminar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      text-align: center;
      padding: 8px;
    }

    .dialog-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      background: #fff5f5;
      border-radius: 50%;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--error-color);
      }
    }

    h2 {
      font-size: 20px;
      font-weight: 600;
      color: #212121;
      margin: 0 0 16px 0;
    }

    mat-dialog-content {
      p {
        font-size: 15px;
        color: var(--text-secondary);
        margin: 8px 0;

        strong {
          color: var(--text-primary);
          font-weight: 700;
        }

        &.warning-text {
          color: var(--error-color);
          font-size: 13px;
          margin-top: 16px;
          font-weight: 500;
        }
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;
      gap: 12px;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  data = inject<{ nombre: string, tipo: 'grupo' | 'empleado' }>(MAT_DIALOG_DATA);
}
