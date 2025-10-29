import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconBtnVariant = 'ghost' | 'primary' | 'danger' | 'secondary';

@Component({
  selector: 'ui-icon-button',
  standalone: true,
  templateUrl: './ui-icon-button.component.html',
  styleUrls: ['./ui-icon-button.component.css'],
  imports: [CommonModule]
})
export class UiIconButtonComponent {
  @Input() icon = 'ri-close-line';
  @Input() variant: IconBtnVariant = 'ghost';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() ariaLabel?: string;
  @Input() title?: string;
  /** Couleur personnalisée du fond (utilisée si fournie). Permet de garder les anciennes actions qui fournissent `color`. */
  @Input() customColor?: string;

  @Output() clicked = new EventEmitter<MouseEvent>();

  onClick(evt: MouseEvent) {
    if (this.disabled || this.loading) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
      return;
    }
    this.clicked.emit(evt);
  }
}
