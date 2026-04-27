import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Club } from '../../services/club.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

@Component({
  selector: 'app-utilisateur-form',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent],
  templateUrl: './utilisateur-form.component.html',
  styleUrls: ['./utilisateur-form.component.css']
})
export class UtilisateurFormComponent {
  refreshClubs() {
    // Émet un événement ou appelle un service pour rafraîchir la liste des clubs
    // À adapter selon la logique de récupération des clubs dans le parent
    window.dispatchEvent(new CustomEvent('refreshClubs'));
  }
  @Input() utilisateur: any = {};
  @Input() clubs: Club[] = [];
  @Input() mode: 'ajout' | 'edition' = 'ajout';
  @Output() submitForm = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  roles = ['ADMIN', 'PARENT', 'MEMBRE', 'SUPER_ADMIN'];

  onSubmit() {
    this.submitForm.emit(this.utilisateur);
  }
}
