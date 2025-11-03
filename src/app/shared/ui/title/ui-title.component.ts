import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-title',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="level">
      <h1 *ngSwitchCase="1" [ngClass]="titleClass" [style.textAlign]="align">{{ text }}</h1>
      <h2 *ngSwitchCase="2" [ngClass]="titleClass" [style.textAlign]="align">{{ text }}</h2>
      <h3 *ngSwitchCase="3" [ngClass]="titleClass" [style.textAlign]="align">{{ text }}</h3>
      <h4 *ngSwitchCase="4" [ngClass]="titleClass" [style.textAlign]="align">{{ text }}</h4>
      <h5 *ngSwitchCase="5" [ngClass]="titleClass" [style.textAlign]="align">{{ text }}</h5>
      <h6 *ngSwitchCase="6" [ngClass]="titleClass" [style.textAlign]="align">{{ text }}</h6>
      <h2 *ngSwitchDefault [ngClass]="titleClass" [style.textAlign]="align">{{ text }}</h2>
    </ng-container>
  `,
  styleUrls: ['./ui-title.component.css']
})
export class UiTitleComponent {
  @Input() text = '';
  @Input() level: number = 2;
  @Input() align: 'left'|'center'|'right' = 'left';
  @Input() color: string = 'var(--blue-main)';
  @Input() gradient = true;

  get titleClass() {
    return {
      'ui-title': true,
      'ui-title-gradient': this.gradient
    };
  }
}
