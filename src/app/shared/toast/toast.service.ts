import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Toast, ToastType, ToastPosition } from './toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly defaultDuration = 4000;
  private readonly defaultPosition: ToastPosition = 'top-right';
  private readonly maxToasts = 4;

  private toasts: Toast[] = [];
  private toastsSub = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this.toastsSub.asObservable();

  /** API générique */
  show(message: string, type: ToastType = 'info', duration = this.defaultDuration, position: ToastPosition = this.defaultPosition, dismissible = true): void {
    const toast: Toast = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      type,
      message,
      duration,
      position,
      dismissible
    };

    if (this.toasts.length >= this.maxToasts) this.toasts.shift(); // limite pile
    this.toasts.push(toast);
    this.toastsSub.next([...this.toasts]);

    if (toast.duration > 0) {
      setTimeout(() => this.remove(toast.id), toast.duration);
    }
  }

  /** Helpers demandés (corrige tes erreurs TS2339) */
  success(message: string, duration = this.defaultDuration, position: ToastPosition = this.defaultPosition, dismissible = true) {
    this.show(message, 'success', duration, position, dismissible);
  }
  error(message: string, duration = this.defaultDuration, position: ToastPosition = this.defaultPosition, dismissible = true) {
    this.show(message, 'error', duration, position, dismissible);
  }
  info(message: string, duration = this.defaultDuration, position: ToastPosition = this.defaultPosition, dismissible = true) {
    this.show(message, 'info', duration, position, dismissible);
  }
  warning(message: string, duration = this.defaultDuration, position: ToastPosition = this.defaultPosition, dismissible = true) {
    this.show(message, 'warning', duration, position, dismissible);
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.toastsSub.next([...this.toasts]);
  }

  clear(): void {
    this.toasts = [];
    this.toastsSub.next([]);
  }
}
