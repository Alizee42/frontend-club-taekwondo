import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconButtonComponent } from '../ui-icon-button/ui-icon-button.component';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule, UiIconButtonComponent],
  templateUrl: './ui-button.component.html',
  styleUrls: ['./ui-button.component.css']
})
export class UiButtonComponent {
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Output() clicked = new EventEmitter<any>();

  onClick(event?: any): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
