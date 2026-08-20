import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Membre } from '../../services/membre.service';
import { UiFormComponent } from '../../shared/ui/form/ui-form.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-membres-super-admin-form',
  standalone: true,
  imports: [CommonModule, FormsModule, UiFormComponent],
  template: `
    <ui-form
      [fields]="fields"
      [model]="membre"
      submitLabel="Valider"
      [error]="formError"
      (submitted)="onSubmit($event)"
      (cancel)="cancel.emit()"
    >
    </ui-form>
  `
})
export class MembresSuperAdminFormComponent implements OnChanges {
  @Input() membre: Partial<Membre> = {};
  @Input() clubId: number | null = null;
  @Output() submitForm = new EventEmitter<Partial<Membre> & { utilisateurId?: number; estAdulte?: boolean }>();
  @Output() cancel = new EventEmitter<void>();

  formError = '';
  isEdition = false;
  fields: any[] = [];

  // Comptes du club, une fois chargés — conservés indépendamment des changements
  // de `membre` (l'ouverture de la modale déclenche les deux inputs en deux passes
  // séparées ; sans ça, le changement de `membre` écrasait la liste déjà chargée).
  private comptes: Array<{ value: string; label: string }> = [];

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['membre']) {
      this.isEdition = !!this.membre?.id;
      this.rebuildFields();
    }
    if (changes['clubId'] && this.clubId) {
      this.loadComptes(this.clubId);
    }
  }

  private rebuildFields(): void {
    const base = [
      { name: 'nom', label: 'Nom', type: 'text', required: true, placeholder: 'Nom du membre' },
      { name: 'prenom', label: 'Prénom', type: 'text', required: true, placeholder: 'Prénom du membre' }
    ];
    // En édition, on ne redemande pas le compte parent/adulte : il est déjà fixé côté backend.
    this.fields = this.isEdition ? base : [
      ...base,
      {
        name: 'compte',
        label: 'Compte à rattacher (parent ou compte adulte)',
        type: 'select',
        required: true,
        options: this.comptes
      }
    ];
  }

  private loadComptes(clubId: number): void {
    this.http.get<any[]>(`${environment.apiUrl}/utilisateurs?clubId=${clubId}`).subscribe({
      next: (utilisateurs) => {
        const candidats = (utilisateurs || []).filter(u => u.role === 'PARENT' || u.role === 'MEMBRE');
        // encode "id:role" dans la valeur pour retrouver le rôle au submit
        this.comptes = candidats.map(u => ({
          value: `${u.id}:${u.role}`,
          label: u.role === 'MEMBRE'
            ? `${u.prenom} ${u.nom} (compte adulte)`
            : `${u.prenom} ${u.nom} (parent)`
        }));
        this.rebuildFields();
      },
      error: () => {
        this.formError = 'Impossible de charger les comptes du club.';
      }
    });
  }

  onSubmit(formValue: any) {
    if (this.isEdition) {
      this.formError = '';
      this.submitForm.emit(formValue);
      return;
    }

    const compte = formValue.compte as string | undefined;
    if (!compte) {
      this.formError = 'Choisissez un compte parent ou un compte adulte à rattacher.';
      return;
    }
    this.formError = '';
    const [idStr, role] = compte.split(':');
    const { compte: _omit, ...rest } = formValue;
    this.submitForm.emit({
      ...rest,
      utilisateurId: Number(idStr),
      estAdulte: role === 'MEMBRE'
    });
  }
}
