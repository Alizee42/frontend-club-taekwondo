import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type UiTitleTone = 'brand' | 'default' | 'muted' | 'danger' | 'success';

@Component({
  selector: 'ui-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="wrapperClasses">
      <div class="ui-title-card">
        <div class="ui-title-left">
          <span *ngIf="icon" class="ui-title-icon" aria-hidden="true">
            <i [class]="icon"></i>
          </span>
          <img *ngIf="logoUrl" [src]="logoUrl" alt="logo" class="ui-avatar" />
          <div class="ui-title-main">
            <ng-container [ngSwitch]="level">
              <h1 *ngSwitchCase="1" [ngClass]="titleClasses">{{ text }}</h1>
              <h2 *ngSwitchCase="2" [ngClass]="titleClasses">{{ text }}</h2>
              <h3 *ngSwitchCase="3" [ngClass]="titleClasses">{{ text }}</h3>
              <h4 *ngSwitchCase="4" [ngClass]="titleClasses">{{ text }}</h4>
              <h5 *ngSwitchCase="5" [ngClass]="titleClasses">{{ text }}</h5>
              <h6 *ngSwitchCase="6" [ngClass]="titleClasses">{{ text }}</h6>
              <h2 *ngSwitchDefault [ngClass]="titleClasses">{{ text }}</h2>
            </ng-container>
            <p *ngIf="subtitle" class="ui-subtitle">{{ subtitle }}</p>
            <div *ngIf="underline" class="ui-title-underline"></div>
          </div>
        </div>
        <div class="ui-title-actions">
          <ng-content select="[title-actions]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./ui-title.component.css']
})
export class UiTitleComponent {
  @Input() text = '';
  @Input() level = 2;
  @Input() align: 'left' | 'center' | 'right' = 'left';
  @Input() color = 'var(--blue-main)';
  @Input() gradient = true;
  @Input() subtitle?: string;
  @Input() underline = false;
  @Input() logoUrl?: string;
  @Input() icon?: string;

  get wrapperClasses(): string[] {
    return ['ui-title-wrapper', `ui-title-wrapper--${this.align}`];
  }

  get titleClasses(): string[] {
    const tone = this.resolveTone(this.color);
    const classes = ['ui-title', `ui-title--${tone}`];

    if (this.gradient && tone === 'brand') {
      classes.push('ui-title-gradient');
    }

    return classes;
  }

  private resolveTone(color: string | undefined): UiTitleTone {
    const token = (color || '').toLowerCase();

    if (
      token.includes('danger') ||
      token.includes('red') ||
      token.includes('brand-accent')
    ) {
      return 'danger';
    }

    if (token.includes('success') || token.includes('green')) {
      return 'success';
    }

    if (
      token.includes('muted') ||
      token.includes('gray') ||
      token.includes('grey') ||
      token.includes('text-2') ||
      token.includes('text-3')
    ) {
      return 'muted';
    }

    if (token.includes('default') || token.includes('color-text')) {
      return 'default';
    }

    return 'brand';
  }
}
