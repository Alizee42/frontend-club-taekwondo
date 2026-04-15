import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type AlertBannerType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-banner.component.html',
  styleUrls: ['./alert-banner.component.css']
})
export class AlertBannerComponent {
  @Input() type: AlertBannerType = 'info';
  @Input() title = '';
  @Input() message = '';
  @Input() dismissible = false;
  @Input() icon = '';

  @Output() dismissed = new EventEmitter<void>();

  get role(): 'alert' | 'status' {
    return this.type === 'error' || this.type === 'warning' ? 'alert' : 'status';
  }

  get resolvedIcon(): string {
    if (this.icon) {
      return this.icon;
    }

    switch (this.type) {
      case 'success':
        return 'ri-checkbox-circle-line';
      case 'error':
        return 'ri-close-circle-line';
      case 'warning':
        return 'ri-alert-line';
      default:
        return 'ri-information-line';
    }
  }

  dismiss(): void {
    this.dismissed.emit();
  }
}
