import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type DashboardNavCardBadgeVariant = 'primary' | 'neutral' | 'danger' | 'warning';

@Component({
  selector: 'app-dashboard-nav-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-nav-card.component.html',
  styleUrls: ['./dashboard-nav-card.component.css']
})
export class DashboardNavCardComponent {
  @Input() label = '';
  @Input() icon = '';
  @Input() badge: number | string | null | undefined = null;
  @Input() badgeVariant: DashboardNavCardBadgeVariant = 'primary';
  @Input() ariaLabel?: string;
  @Output() pressed = new EventEmitter<void>();

  get hasBadge(): boolean {
    return this.badge !== null && this.badge !== undefined && this.badge !== '';
  }
}
