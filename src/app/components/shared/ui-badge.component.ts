import { Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="ui-badge" [ngClass]="badgeClass">
      <ng-content></ng-content>
    </span>
  `,
  styleUrls: ['./ui-badge.component.css']
})
export class UiBadgeComponent {
  @Input() type: string = '';

  get badgeClass(): string {
    switch (this.type) {
      case 'competition':
        return 'badge-competition';
      case 'annonce':
        return 'badge-annonce';
      case 'info':
        return 'badge-info';
      case 'event':
        return 'badge-event';
      case 'alert':
        return 'badge-alert';
      case 'sport':
        return 'badge-sport';
      default:
        return 'badge-default';
    }
  }
}
