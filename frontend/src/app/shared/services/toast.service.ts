import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

/**
 * Toast notification service for instant feedback
 * Provides success, error, warning and info notifications
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  private _nextId = 0;

  readonly toasts = this._toasts.asReadonly();

  /**
   * Show a success toast
   */
  success(message: string, duration: number = 4000): void {
    this.show('success', message, duration);
  }

  /**
   * Show an error toast
   */
  error(message: string, duration: number = 5000): void {
    this.show('error', message, duration);
  }

  /**
   * Show a warning toast
   */
  warning(message: string, duration: number = 4000): void {
    this.show('warning', message, duration);
  }

  /**
   * Show an info toast
   */
  info(message: string, duration: number = 3000): void {
    this.show('info', message, duration);
  }

  /**
   * Remove a specific toast by ID
   */
  remove(id: number): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this._toasts.set([]);
  }

  /**
   * Internal method to show a toast
   */
  private show(type: ToastType, message: string, duration: number): void {
    const id = ++this._nextId;
    const toast: ToastMessage = { id, type, message, duration };

    this._toasts.update(toasts => [...toasts, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }
}
