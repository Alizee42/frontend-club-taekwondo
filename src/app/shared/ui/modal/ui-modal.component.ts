import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-modal.component.html',
  styleUrls: ['./ui-modal.component.css']
})
export class UiModalComponent {
  @Input() open: boolean = false;
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() size: ModalSize = 'md';
  @Input() showClose: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() closeOnEscape: boolean = true;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open && this.closeOnEscape) {
      this.close();
    }
  }

  get modalClasses(): string[] {
    return [`ui-modal--${this.size}`];
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.close();
    }
  }

  close() {
    this.closed.emit();
  }
}
