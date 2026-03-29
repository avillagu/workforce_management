import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastService, ToastMessage } from '@shared/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }} slide-in-down">
          <div class="toast-icon">
            @if (toast.type === 'success') {
              <mat-icon>check_circle</mat-icon>
            } @else if (toast.type === 'error') {
              <mat-icon>error</mat-icon>
            } @else if (toast.type === 'warning') {
              <mat-icon>warning</mat-icon>
            } @else {
              <mat-icon>info</mat-icon>
            }
          </div>
          <div class="toast-content">{{ toast.message }}</div>
          <button mat-icon-button class="toast-close" (click)="toastService.remove(toast.id)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 420px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: #fff;
      border-left: 4px solid;
      animation: slideInRight 0.3s ease-out;
      min-width: 320px;
    }

    .toast-success {
      border-left-color: #4caf50;
    }

    .toast-success .toast-icon {
      color: #4caf50;
    }

    .toast-error {
      border-left-color: #f44336;
    }

    .toast-error .toast-icon {
      color: #f44336;
    }

    .toast-warning {
      border-left-color: #ff9800;
    }

    .toast-warning .toast-icon {
      color: #ff9800;
    }

    .toast-info {
      border-left-color: #2196f3;
    }

    .toast-info .toast-icon {
      color: #2196f3;
    }

    .toast-icon {
      flex-shrink: 0;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .toast-content {
      flex: 1;
      font-size: 14px;
      color: #212121;
      line-height: 1.4;
    }

    .toast-close {
      flex-shrink: 0;
      width: 32px;
      height: 32px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #757575;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.04);
      }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .toast-container {
        top: auto;
        bottom: 24px;
        right: 16px;
        left: 16px;
        max-width: none;
      }

      .toast {
        min-width: auto;
      }
    }
  `]
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
