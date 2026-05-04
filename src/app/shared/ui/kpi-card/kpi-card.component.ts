import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type KpiTone =
  | 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'teal'
  | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type KpiBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'ui-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.css']
})
export class KpiCardComponent {
  @Input() icon = '';
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() meta = '';
  @Input() tone: KpiTone = 'primary';
  @Input() badge = '';
  @Input() badgeTone: KpiBadgeTone = 'neutral';
  @Input() loading = false;
  /** Texte d'évolution affiché sous la valeur. Ex: "+12%", "-3 membres" */
  @Input() trend = '';
  /** true = hausse (vert), false = baisse (rouge), null = neutre (gris) */
  @Input() trendUp: boolean | null = null;

  get toneClass(): string {
    return `kpi-card--${this.tone}`;
  }

  get badgeClass(): string {
    return `status-badge status--${this.badgeTone}`;
  }

  get trendClass(): string {
    if (this.trendUp === true) return 'kpi-card__trend kpi-card__trend--up';
    if (this.trendUp === false) return 'kpi-card__trend kpi-card__trend--down';
    return 'kpi-card__trend kpi-card__trend--neutral';
  }

  get trendIcon(): string {
    if (this.trendUp === true) return 'ri-arrow-up-s-line';
    if (this.trendUp === false) return 'ri-arrow-down-s-line';
    return 'ri-subtract-line';
  }
}
