import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Toast } from '../toast.model';
import { ToastService } from '../toast.service';

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

  trackById = (_: number, toast: Toast) => toast.id;

  normalizeType(type: string | undefined | null): Normalized {
    const normalized = (type || '').toLowerCase();

    if (
      normalized === 'success' ||
      normalized === 'error' ||
      normalized === 'info' ||
      normalized === 'warning'
    ) {
      return normalized;
    }

    if (normalized === 'warn') {
      return 'warning';
    }

    return 'info';
  }

  getIconClass(type: string | undefined | null): string {
    switch (this.normalizeType(type)) {
      case 'success': return 'ri-checkbox-circle-fill';
      case 'error':   return 'ri-close-circle-fill';
      case 'warning': return 'ri-error-warning-fill';
      default:        return 'ri-information-fill';
    }
  }

  getProgressDuration(toast: Toast): string {
    return toast.duration > 0 ? `${toast.duration}ms` : '0ms';
  }
}
