import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiButtonComponent } from '../buttons/ui-button/ui-button.component';

@Component({
  selector: 'ui-form',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent],
  templateUrl: './ui-form.component.html',
  styleUrls: ['./ui-form.component.css']
})
export class UiFormComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() fields: any[] = [];
  @Input() submitLabel: string = 'Envoyer';
  @Input() cancelLabel: string = 'Annuler';
  @Input() showCancel: boolean = true;
  @Input() loading: boolean = false;
  @Input() error: string = '';
  @Input() set model(value: any) {
    this.formData = value ? { ...value } : {};
  }
  @Output() submitted = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  formData: any = {};

  onSubmit() {
    this.submitted.emit(this.formData);
  }
}
