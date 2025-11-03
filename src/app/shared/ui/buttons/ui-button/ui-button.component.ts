import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ui-button.component.html',
  styleUrls: ['./ui-button.component.css']
})
export class UiButtonComponent {
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() customClass: string = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() routerLink: any;
  @Output() clicked = new EventEmitter<any>();

  onClick(event?: any): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
