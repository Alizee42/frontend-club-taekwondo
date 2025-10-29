import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Membre } from '../../services/membre.service';
import { UiFormComponent } from '../../shared/ui/form/ui-form.component';

@Component({
  selector: 'app-membres-super-admin-form',
  standalone: true,
  imports: [CommonModule, FormsModule, UiFormComponent],
  template: `
    <ui-form
      [fields]="fields"
      [model]="membre"
      submitLabel="Valider"
      (submitted)="onSubmit($event)"
    >
    </ui-form>
  `
})
export class MembresSuperAdminFormComponent {
  @Input() membre: Partial<Membre> = {};
  @Output() submitForm = new EventEmitter<Partial<Membre>>();
  @Output() cancel = new EventEmitter<void>();

  fields = [
    { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Nom du membre' },
    { name: 'prenom', label: 'Prénom', type: 'text', required: true, placeholder: 'Prénom du membre' }
  ];

  onSubmit(formValue: any) {
    this.submitForm.emit(formValue);
  }
}
