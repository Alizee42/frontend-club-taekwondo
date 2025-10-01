import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ToastService } from '../toast.service';
import { Toast } from '../toast.model';

type Normalized = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.css']
})
export class ToastContainerComponent implements OnInit {
  toasts$!: Observable<Toast[]>;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toasts$ = this.toastService.toasts$;
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }

  trackById = (_: number, t: Toast) => t.id;

  /** Mappe 'warn' -> 'warning' et sécurise les autres valeurs */
  normalizeType(type: string | undefined | null): Normalized {
    const t = (type || '').toLowerCase();
    if (t === 'success' || t === 'error' || t === 'info' || t === 'warning') return t;
    if (t === 'warn') return 'warning';
    return 'info';
  }

  getIcon(type: string): string {
    switch (this.normalizeType(type)) {
      case 'success':  return '✅';
      case 'error':    return '❌';
      case 'info':     return 'ℹ️';
      case 'warning':  return '⚠️';
      default:         return 'ℹ️';
    }
  }
}
