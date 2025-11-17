import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-title-wrapper" [style.textAlign]="align">
      <!-- Card style header -->
      <div class="ui-title-card">
        <div class="ui-title-left">
          <i *ngIf="icon" [class]="icon + ' ui-title-icon'"></i>
          <img *ngIf="logoUrl" [src]="logoUrl" alt="logo" class="ui-avatar" />
          <div class="ui-title-main">
            <ng-container [ngSwitch]="level">
              <h1 *ngSwitchCase="1" [ngClass]="titleClass" [style.color]="color">{{ text }}</h1>
              <h2 *ngSwitchCase="2" [ngClass]="titleClass" [style.color]="color">{{ text }}</h2>
              <h3 *ngSwitchCase="3" [ngClass]="titleClass" [style.color]="color">{{ text }}</h3>
              <h4 *ngSwitchCase="4" [ngClass]="titleClass" [style.color]="color">{{ text }}</h4>
              <h5 *ngSwitchCase="5" [ngClass]="titleClass" [style.color]="color">{{ text }}</h5>
              <h6 *ngSwitchCase="6" [ngClass]="titleClass" [style.color]="color">{{ text }}</h6>
              <h2 *ngSwitchDefault [ngClass]="titleClass" [style.color]="color">{{ text }}</h2>
            </ng-container>
            <p *ngIf="subtitle" class="ui-subtitle">{{ subtitle }}</p>
            <div class="ui-title-underline" *ngIf="underline"></div>
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
  @Input() level: number = 2;
  @Input() align: 'left'|'center'|'right' = 'left';
  @Input() color: string = 'var(--blue-main)';
  @Input() gradient = true;
  @Input() subtitle: string | undefined;
  // underline disabled by default for a cleaner header. Pass [underline]="true" when needed.
  @Input() underline: boolean = false;
  @Input() logoUrl?: string;
  @Input() icon?: string;

  get titleClass() {
    return {
      'ui-title': true,
      'ui-title-gradient': this.gradient
    };
  }
}
