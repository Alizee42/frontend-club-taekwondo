import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { Component, OnInit } from '@angular/core';
import { GroupByPipe } from '../../pipes/group-by.pipe';
import { HorairesService } from '../../services/horaires.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gestion-horaires-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, GroupByPipe],
  templateUrl: './gestion-horaires-super-admin.component.html',
  styleUrls: ['./gestion-horaires-super-admin.component.css']
})
export class GestionHorairesSuperAdminComponent implements OnInit {
  clubs: any[] = [];
  horairesParJour: any[] = [];
  selectedClubId: number|string = 'ALL';

  showAjoutModal = false;
  ajoutJour: string = '';
  ajoutPlages: any[] = [];
  openedPlageIndex: number = 0;

  // Pour compatibilité avec l'ancien formulaire simple
  ajoutPlage: string = '';
  ajoutGroupe: string = '';
  ajoutAdresse: string = '';
  ajoutCodePostal: string = '';
  ajoutVille: string = '';
  // Méthode appelée lors du changement de jour dans la modale
  onJourChange() {
    if (this.ajoutJour) {
      if (this.ajoutPlages.length === 0) {
        this.ajoutPlages = [this.createEmptyPlage()];
        this.openedPlageIndex = 0;
      }
    } else {
      this.ajoutPlages = [];
    }
  }

  createEmptyPlage() {
    return {
      plage: '',
      groupe: '',
      adresse: '',
      codePostal: '',
      ville: '',
      memeAdresse: false
    };
  }

  addPlageForm() {
    this.ajoutPlages.push(this.createEmptyPlage());
    this.openedPlageIndex = this.ajoutPlages.length - 1;
  }

  removePlageForm(i: number) {
    this.ajoutPlages.splice(i, 1);
    if (this.openedPlageIndex >= this.ajoutPlages.length) {
      this.openedPlageIndex = this.ajoutPlages.length - 1;
    }
  }

  deletePlageWithConfirm(i: number) {
    if (confirm('Supprimer cette plage horaire ?')) {
      this.removePlageForm(i);
    }
  }

  onMemeAdresseChange(plage: any, plages: any[]) {
    if (plage.memeAdresse && plages.length > 0) {
      plage.adresse = plages[0].adresse;
      plage.codePostal = plages[0].codePostal;
      plage.ville = plages[0].ville;
    }
  }

  constructor(private horairesService: HorairesService) {}

  get ajoutFormValid() {
  if (!this.ajoutJour || this.ajoutPlages.length === 0) return false;
  return this.ajoutPlages.every(plage => plage.plage && plage.groupe && plage.adresse && plage.codePostal && plage.ville);
  }

  get selectedClubName(): string {
    const club = this.clubs.find(c => c.id === this.selectedClubId);
    return club ? club.name : '';
  }

  getClubName(clubOrId: any): string {
    // Accepte soit un id, soit un objet club, soit undefined
    let id: number | undefined;
    if (clubOrId && typeof clubOrId === 'object' && 'id' in clubOrId) {
      id = Number(clubOrId.id);
    } else if (clubOrId !== undefined && clubOrId !== null) {
      id = Number(clubOrId);
    }
    if (id !== undefined && !isNaN(id)) {
      const club = this.clubs.find((c: any) => Number(c.id) === id);
      return club ? club.name : `Club #${id}`;
    }
    return 'Club inconnu';
  }

  ngOnInit(): void {
    // Charger la liste des clubs (à adapter si tu as une API clubs)
    this.clubs = [
      { id: 1, name: 'Villeurbanne' },
      { id: 2, name: 'Bourg-en-Bresse' },
      // Ajoute ici tous les clubs connus de la base, exemple :
      // { id: 3, name: 'Autre Club' }
    ];
    // Par défaut, afficher tous les horaires de tous les clubs
    this.selectedClubId = 'ALL';
    this.loadHoraires('ALL');
  }

  loadHoraires(clubId: number|string) {
    if (clubId === 'ALL') {
      this.horairesService.getAllHoraires().subscribe(horaires => {
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
      });
    } else {
      this.horairesService.getHorairesByClub(Number(clubId)).subscribe(horaires => {
        const map = new Map<string, any[]>();
        horaires.forEach(h => {
          if (!map.has(h.jour)) map.set(h.jour, []);
          map.get(h.jour)!.push(h);
        });
        this.horairesParJour = Array.from(map.entries()).map(([jour, items]) => ({
          jour,
          horaires: items
        }));
      });
    }
  }

  selectClub(clubId: number|string) {
    this.selectedClubId = clubId;
    this.loadHoraires(clubId);
  }

  addHoraire() {
    if (this.selectedClubId !== null && this.selectedClubId !== 'ALL' && this.ajoutFormValid) {
      const clubId = Number(this.selectedClubId);
      const horairesToSend = this.ajoutPlages.map(plage => {
        let heureDebut = '';
        let heureFin = '';
        if (plage.plage && plage.plage.includes('-')) {
          const parts = plage.plage.split('-');
          heureDebut = parts[0].trim();
          heureFin = parts[1].trim();
        }
        return {
          jour: this.ajoutJour,
          heureDebut,
          heureFin,
          groupe: plage.groupe,
          adresse: plage.adresse,
          codePostal: plage.codePostal,
          ville: plage.ville,
          clubId
        };
      });
      // Envoi en batch ou un par un selon l'API
      Promise.all(horairesToSend.map(horaire =>
        this.horairesService.addHoraireToClub(clubId, horaire).toPromise()
      )).then(() => {
        this.loadHoraires(this.selectedClubId!);
        this.resetAjoutForm();
        this.showAjoutModal = false;
      });
    }
  }

  resetAjoutForm() {
  this.ajoutJour = '';
  this.ajoutPlages = [];
  this.openedPlageIndex = 0;
  }

  deleteHoraire(horaireId: number) {
    this.horairesService.deleteHoraire(horaireId).subscribe(() => {
      if (this.selectedClubId !== null) {
        this.loadHoraires(this.selectedClubId!);
      }
    });
  }
}