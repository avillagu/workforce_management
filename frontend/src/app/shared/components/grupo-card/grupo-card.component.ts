import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Grupo } from '@core/models/operacion.models';

@Component({
  selector: 'app-grupo-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule
  ],
  template: `
    <mat-card class="grupo-card">
      <mat-card-header>
        <mat-card-title>
          <div class="card-title-group">
            <div class="title-left">
              <mat-icon class="title-icon">groups</mat-icon>
              <span>{{ grupo.nombre }}</span>
            </div>
            
            <button mat-icon-button [matMenuTriggerFor]="menu" class="more-btn">
              <mat-icon>more_vert</mat-icon>
            </button>
          </div>
        </mat-card-title>

        <mat-menu #menu="matMenu" xPosition="before" class="custom-menu">
          <button mat-menu-item (click)="onEdit()">
            <mat-icon color="primary">edit</mat-icon>
            <span>Editar Grupo</span>
          </button>
          <button mat-menu-item (click)="onDelete()">
            <mat-icon color="warn">delete</mat-icon>
            <span>Eliminar Grupo</span>
          </button>
        </mat-menu>
      </mat-card-header>
      
      <mat-card-content>
        <p class="descripcion">{{ grupo.descripcion || 'Sin descripción' }}</p>
        
        <div class="card-meta">
          <div class="meta-item">
            <mat-icon>calendar_today</mat-icon>
            <span>Creado: {{ grupo.created_at | date: 'dd/MM/yyyy' }}</span>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .grupo-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      border: 1px solid #e0e0e0;

      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        transform: translateY(-2px);
      }
    }

    .card-title-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 16px 16px 8px;
    }

    .title-left {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-color);
      letter-spacing: -0.3px;

      .title-icon {
        color: #3b82f6; // Azul brillante
        font-size: 26px;
        width: 26px;
        height: 26px;
        background: rgba(59, 130, 246, 0.1);
        padding: 8px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: content-box;
      }
    }

    .more-btn {
      color: #94a3b8;
      &:hover {
        background: rgba(148, 163, 184, 0.1);
        color: var(--primary-color);
      }
    }

    .descripcion {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
      margin: 12px 0 20px;
      padding: 0 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      padding: 16px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748b;
      font-weight: 500;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #94a3b8;
      }
    }

  `]
})
export class GrupoCardComponent {
  @Input({ required: true }) grupo!: Grupo;
  @Output() edit = new EventEmitter<Grupo>();
  @Output() delete = new EventEmitter<Grupo>();

  onEdit(): void {
    this.edit.emit(this.grupo);
  }

  onDelete(): void {
    this.delete.emit(this.grupo);
  }
}
