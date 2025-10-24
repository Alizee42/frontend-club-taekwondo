import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { Component, OnInit, Input } from '@angular/core';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { HorairesService } from '../../services/horaires.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gestion-horaires-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, UiTableComponent],
  templateUrl: './gestion-horaires-admin.component.html',
  styleUrls: ['./gestion-horaires-admin.component.css']
})
export class GestionHorairesAdminComponent implements OnInit {
  // Affiche la tranche horaire (plage ou heureDebut/heureFin)
  formatTrancheHoraire(row: any): string {
    if (row.heureDebut && row.heureFin) {
      return row.heureDebut + ' - ' + row.heureFin;
    }
    return '';
  }
  // Méthode pour formater l'adresse d'un horaire
  formatAdresse(row: any): string {
    let adresse = row.adresse || '';
    if (row.codePostal) adresse += ' ' + row.codePostal;
    if (row.ville) adresse += ' ' + row.ville;
    return adresse;
  }
  // Gestion des actions du tableau
  onTableAction(event: { action: string; row: any }, jourBlock: any) {
    if (event.action === 'edit') {
      this.editHoraire(event.row);
    } else if (event.action === 'delete') {
      this.deleteHoraire(event.row.id);
    }
  }
  // Suivi de l'état d'édition par id d'horaire
  editingHoraireId: number|null = null;
  // Copie temporaire pour édition
  editedHoraire: any = null;
  openedPlageIndex: number = 0;

  editHoraire(horaire: any): void {
    this.editingHoraireId = horaire.id;
    // On clone l'objet pour édition locale
    this.editedHoraire = { ...horaire };
  }

  cancelEditHoraire(): void {
    this.editingHoraireId = null;
    this.editedHoraire = null;
  }

  saveEditHoraire(): void {
    if (!this.editedHoraire) return;
    // Appel au service pour sauvegarder
    this.horairesService.updateHoraire(this.editedHoraire.id, this.editedHoraire).subscribe(() => {
      this.loadHoraires();
      this.editingHoraireId = null;
      this.editedHoraire = null;
    });
  }

  // Ouvre le premier fieldset à la sélection du jour
  onJourChange() {
    if (this.ajoutPlages.length > 0) {
      this.openedPlageIndex = 0;
    }
  }

  // Ajoute un horaire et ouvre le nouveau fieldset
  addPlageForm() {
    this.ajoutPlages.push({ plage: '', groupe: '', adresse: '', codePostal: '', ville: '', memeAdresse: false });
    this.openedPlageIndex = this.ajoutPlages.length - 1;
  }

  // Supprime un horaire avec confirmation

  // Supprime un horaire avec confirmation
  deletePlageWithConfirm(index: number) {
    if (confirm('Supprimer cet horaire ?')) {
      this.removePlageForm(index);
    }
  }
  // Supprime tous les horaires d'un jour donné
  deleteJour(jour: string) {
    // Filtre local côté frontend
    this.horairesParJour = this.horairesParJour.filter(jb => jb.jour !== jour);
    // Si vous souhaitez supprimer côté backend, appelez le service ici
    // this.horairesService.deleteHorairesByJour(jour, this.clubId).subscribe(...)
  }
  showPlagesForm = false;
  onMemeAdresseChange(plage: any, ajoutPlages: any[]) {
    if (plage.memeAdresse) {
      plage.adresse = ajoutPlages[0]?.adresse || '';
      plage.codePostal = ajoutPlages[0]?.codePostal || '';
      plage.ville = ajoutPlages[0]?.ville || '';
    } else {
      plage.adresse = '';
      plage.codePostal = '';
      plage.ville = '';
    }
  }
  addHoraireInline(jourBlock: any) {
    const plage = jourBlock.newPlage || '';
    const groupe = jourBlock.newGroupe || '';
    const adresse = jourBlock.newAdresse || '';
    const codePostal = jourBlock.newCodePostal || '';
    const ville = jourBlock.newVille || '';
    if (!plage || !groupe || !adresse || !codePostal || !ville) return;
    let heureDebut = '';
    let heureFin = '';
    if (plage.includes('-')) {
      const parts = plage.split('-');
      heureDebut = parts[0].trim();
      heureFin = parts[1].trim();
    }
    const horaire = {
      jour: jourBlock.jour,
      plage,
      heureDebut,
      heureFin,
      groupe,
      adresse,
      codePostal,
      ville,
      clubId: this.clubId
    };
    this.horairesService.addHoraireToClub(this.clubId, horaire).subscribe({
      next: (res) => {
        console.log('Ajout horaire inline - réponse backend:', res);
        this.loadHoraires();
        jourBlock.showAddForm = false;
        jourBlock.newPlage = '';
        jourBlock.newGroupe = '';
        jourBlock.newAdresse = '';
        jourBlock.newCodePostal = '';
        jourBlock.newVille = '';
      },
      error: (err) => {
        console.error('Erreur ajout horaire inline:', err);
      }
    });
  }
  @Input() clubId: number = 1;
  horairesParJour: any[] = [];

  showAjoutModal = false;
  ajoutJour: string = '';
  ajoutPlages: Array<{
    plage: string;
    groupe: string;
    adresse: string;
    codePostal: string;
    ville: string;
    memeAdresse?: boolean;
  }> = [
    { plage: '', groupe: '', adresse: '', codePostal: '', ville: '', memeAdresse: false }
  ];

  constructor(private horairesService: HorairesService) {}

  get ajoutFormValid() {
    if (!this.ajoutJour) return false;
    return this.ajoutPlages.every(p => p.plage && p.groupe && p.adresse && p.codePostal && p.ville);
  }

  removePlageForm(index: number) {
    if (this.ajoutPlages.length > 1) {
      this.ajoutPlages.splice(index, 1);
    }
  }

  ngOnInit(): void {
    this.loadHoraires();
  }

  loadHoraires() {
    this.horairesService.getHorairesByClub(this.clubId).subscribe(horaires => {
      console.log('Horaires récupérés:', horaires);
      // Regrouper par jour
      const map = new Map<string, any[]>();
      horaires.forEach(h => {
        if (!map.has(h.jour)) map.set(h.jour, []);
        map.get(h.jour)!.push(h);
      });
      this.horairesParJour = Array.from(map.entries()).map(([jour, items]) => ({
        jour,
        horaires: items
      }));
      console.log('Horaires regroupés:', this.horairesParJour);
    });
  }

  addHoraire() {
    if (this.ajoutFormValid) {
      const requests = this.ajoutPlages.map(plageObj => {
        let heureDebut = '';
        let heureFin = '';
        if (plageObj.plage && plageObj.plage.includes('-')) {
          const parts = plageObj.plage.split('-');
          heureDebut = parts[0].trim();
          heureFin = parts[1].trim();
        }
        const horaire = {
          jour: this.ajoutJour,
          plage: plageObj.plage,
          heureDebut,
          heureFin,
          groupe: plageObj.groupe,
          adresse: plageObj.adresse,
          codePostal: plageObj.codePostal,
          ville: plageObj.ville,
          clubId: this.clubId
        };
        return this.horairesService.addHoraireToClub(this.clubId, horaire);
      });
      Promise.all(requests.map(obs => obs.toPromise())).then(() => {
        this.loadHoraires();
        this.showAjoutModal = false;
        this.ajoutJour = '';
        this.ajoutPlages = [{ plage: '', groupe: '', adresse: '', codePostal: '', ville: '' }];
      });
    }
  }

  resetAjoutForm() {
    this.ajoutJour = '';
    this.ajoutPlages = [{ plage: '', groupe: '', adresse: '', codePostal: '', ville: '' }];
  }

  deleteHoraire(horaireId: number) {
    this.horairesService.deleteHoraire(horaireId).subscribe(() => {
      this.loadHoraires();
    });
  }
}
