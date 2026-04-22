import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { Component, OnInit, Input } from '@angular/core';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { HorairesService } from '../../services/horaires.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-gestion-horaires-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, UiTableComponent, PageHeaderComponent],
  templateUrl: './gestion-horaires-admin.component.html',
  styleUrls: ['./gestion-horaires-admin.component.css']
})
export class GestionHorairesAdminComponent implements OnInit {
  @Input() clubId: number = 1;
  horairesParJour: any[] = [];
  horaires: any[] = [];
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
  openedPlageIndex: number = 0;
  // Pour la modale d'ajout de plage par jour
  showAjoutPlageModal: boolean = false;
  jourAjoutPlage: string = '';
  ajoutPlageData: { plage: string; groupe: string; adresse: string; codePostal: string; ville: string } = { plage: '', groupe: '', adresse: '', codePostal: '', ville: '' };
  editingPlageIndex: number|null = null;

  constructor(private horairesService: HorairesService) {}

  ngOnInit(): void {
    this.loadHoraires();
  }

  // Action sur les boutons du tableau (éditer/supprimer)
  onTableAction(event: { action: string, row: any }, jourBlock?: any) {
    if (event.action === 'delete') {
      this.deleteHoraire(event.row.id);
    } else if (event.action === 'edit') {
      // Ouvre la modale d'ajout pré-remplie pour édition
      this.jourAjoutPlage = event.row.jour;
      this.ajoutPlageData = {
        plage: event.row.plage,
        groupe: event.row.groupe,
        adresse: event.row.adresse,
        codePostal: event.row.codePostal,
        ville: event.row.ville
      };
      this.showAjoutPlageModal = true;
    }
  }

  openAjoutPlageModal(jour: string) {
    this.jourAjoutPlage = jour;
    this.ajoutPlageData = { plage: '', groupe: '', adresse: '', codePostal: '', ville: '' };
    this.showAjoutPlageModal = true;
  }

  closeAjoutPlageModal() {
    this.showAjoutPlageModal = false;
    this.jourAjoutPlage = '';
  }

  submitAjoutPlageModal() {
    const { plage, groupe, adresse, codePostal, ville } = this.ajoutPlageData;
    if (!plage || !groupe || !adresse || !codePostal || !ville) return;
    let heureDebut = '';
    let heureFin = '';
    if (plage.includes('-')) {
      const parts = plage.split('-');
      heureDebut = parts[0].trim();
      heureFin = parts[1].trim();
    }
    const horaire = {
      jour: this.jourAjoutPlage,
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
      next: () => {
        this.loadHoraires();
        this.closeAjoutPlageModal();
      },
      error: (err) => {
        console.error('Erreur ajout plage modale:', err);
      }
    });
  }

  loadHoraires() {
    this.horairesService.getHorairesByClub(this.clubId).subscribe(horaires => {
      this.horaires = horaires;
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
  }

  get ajoutFormValid() {
    if (!this.ajoutJour) return false;
    return this.ajoutPlages.every(p => p.plage && p.groupe && p.adresse && p.codePostal && p.ville);
  }

  addPlageForm() {
    this.ajoutPlages.push({ plage: '', groupe: '', adresse: '', codePostal: '', ville: '', memeAdresse: false });
    this.openedPlageIndex = this.ajoutPlages.length - 1;
  }

  removePlageForm(index: number) {
    if (this.ajoutPlages.length > 1) {
      this.ajoutPlages.splice(index, 1);
      if (this.editingPlageIndex === index) {
        this.editingPlageIndex = null;
      }
    }
  }

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
