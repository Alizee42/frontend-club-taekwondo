import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'ui-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ui-form.component.html',
  styleUrls: ['./ui-form.component.css']
})
export class UiFormComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() fields: any[] = [];
  @Input() submitLabel: string = 'Envoyer';
  @Input() loading: boolean = false;
  @Input() error: string = '';
  @Output() submitted = new EventEmitter<any>();

  formData: any = {};

  onSubmit() {
    this.submitted.emit(this.formData);
  }
}
