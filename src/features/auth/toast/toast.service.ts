import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id:      number;
  type:    ToastType;
  title:   string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private counter = 0;

  show(title: string, message: string, type: ToastType = 'info', duration = 4500): void {
    const id = ++this.counter;
    this.toasts.update(t => [...t, { id, type, title, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, title = 'Success'): void {
    this.show(title, message, 'success');
  }

  error(message: string, title = 'Error'): void {
    this.show(title, message, 'error', 6000);
  }

  info(message: string, title = 'Info'): void {
    this.show(title, message, 'info');
  }

  warning(message: string, title = 'Warning'): void {
    this.show(title, message, 'warning', 5000);
  }

  dismiss(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}