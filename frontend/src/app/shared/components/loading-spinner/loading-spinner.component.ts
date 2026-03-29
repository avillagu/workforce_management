import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="spinner-container" [class.spinner-overlay]="overlay">
      <mat-progress-spinner
        [diameter]="diameter"
        [strokeWidth]="strokeWidth"
        [mode]="mode"
        [value]="value"
        color="primary"
      ></mat-progress-spinner>
      @if (message) {
        <p class="spinner-message">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .spinner-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      z-index: 999;
    }

    .spinner-message {
      margin-top: 16px;
      font-size: 14px;
      color: #757575;
      text-align: center;
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() diameter: number = 40;
  @Input() strokeWidth: number = 4;
  @Input() mode: 'determinate' | 'indeterminate' = 'indeterminate';
  @Input() value: number = 0;
  @Input() message?: string;
  @Input() overlay: boolean = false;
}
