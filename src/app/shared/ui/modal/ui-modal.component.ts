import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Input() showClose: boolean = true;
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
