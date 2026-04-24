import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

export type UiButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'ghost';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ui-button.component.html',
  styleUrls: ['./ui-button.component.css']
})
export class UiButtonComponent {
  @Input() label = '';
  @Input() icon = '';
  @Input() variant: UiButtonVariant = 'primary';
  @Input() color?: UiButtonVariant;
  @Input() disabled = false;
  @Input() loading = false;
  @Input() customClass = '';
  @Input() title?: string;
  @Input('aria-label') ariaLabel?: string;
  @Input() full = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() routerLink: any;
  @Output() clicked = new EventEmitter<Event>();

  get resolvedVariant(): UiButtonVariant {
    return this.color ?? this.variant;
  }

  get buttonClasses(): string[] {
    const classes: string[] = [this.resolvedVariant, `btn-${this.resolvedVariant}`];

    if (this.resolvedVariant === 'primary') {
      classes.push('v-primary');
    }

    if (this.full) {
      classes.push('btn-full');
    }

    if (this.loading) {
      classes.push('is-loading');
    }

    if (this.customClass.trim()) {
      classes.push(...this.customClass.trim().split(/\s+/));
    }

    return classes;
  }

  get computedAriaLabel(): string | null {
    return this.ariaLabel || this.title || this.label || null;
  }

  onClick(event?: Event): void {
    if (this.disabled || this.loading) {
      event?.preventDefault();
      event?.stopPropagation();
      return;
    }

    this.clicked.emit(event);
  }
}
