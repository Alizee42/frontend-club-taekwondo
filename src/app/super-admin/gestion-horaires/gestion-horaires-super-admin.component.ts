import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { HorairesService } from '../../services/horaires.service';
import { ClubService, Club } from '../../services/club.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

type PlageForm = {
  plage: string;
  groupe: string;
  adresse: string;
  codePostal: string;
  ville: string;
  memeAdresse?: boolean;
};

@Component({
  selector: 'app-gestion-horaires-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './gestion-horaires-super-admin.component.html',
  styleUrls: ['./gestion-horaires-super-admin.component.css']
})
export class GestionHorairesSuperAdminComponent implements OnInit {
  clubs: any[] = [];
  horairesParJour: Array<{ jour: string; horaires: any[] }> = [];
  horaires: any[] = [];
  selectedClubId: number | null = null;

  showAjoutModal = false;
  ajoutJour = '';
  ajoutPlages: PlageForm[] = [this.emptyPlage()];
  openedPlageIndex = 0;

  showAjoutPlageModal = false;
  jourAjoutPlage = '';
  ajoutPlageData: PlageForm = this.emptyPlage();
  editingHoraireId: number | null = null;
  editingPlageIndex: number | null = null;

  readonly joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  readonly plagesHoraires = [
    '8h - 9h',
    '9h - 10h',
    '10h - 11h',
    '11h - 12h',
    '14h - 15h',
    '15h - 16h',
    '16h - 17h',
    '17h - 18h',
    '18h - 19h',
    '19h - 20h',
    '20h - 21h'
  ];

  constructor(private horairesService: HorairesService, private clubService: ClubService) {}

  ngOnInit(): void {
    this.clubService.getClubs().subscribe({
      next: (clubs: Club[]) => {
        this.clubs = clubs || [];
        const selectedClub = this.clubService.getSelectedClub();
        this.selectedClubId = selectedClub?.id ?? this.clubs[0]?.id ?? null;
        this.loadHoraires();
      },
      error: (err) => {
        console.error('Impossible de charger la liste des clubs :', err);
        this.selectedClubId = this.clubService.getSelectedClub()?.id ?? null;
        this.loadHoraires();
      }
    });
  }

  onTableAction(event: { action: string; row: any }) {
    if (event.action === 'delete') {
      this.deleteHoraire(event.row.id);
      return;
    }

    if (event.action === 'edit') {
      this.openEditHoraireModal(event.row);
    }
  }

  onClubChange() {
    this.openedPlageIndex = 0;
    this.loadHoraires();
  }

  loadHoraires() {
    if (!this.selectedClubId) {
      this.horaires = [];
      this.horairesParJour = this.buildWeek([]);
      return;
    }

    this.horairesService.getHorairesByClub(this.selectedClubId).subscribe(horaires => {
      this.horaires = horaires || [];
      this.horairesParJour = this.buildWeek(this.horaires);
    });
  }

  openAjoutPlageModal(jour: string) {
    this.jourAjoutPlage = jour;
    this.ajoutPlageData = this.emptyPlage();
    this.editingHoraireId = null;
    this.showAjoutPlageModal = true;
  }

  openEditHoraireModal(horaire: any) {
    this.editingHoraireId = horaire.id ?? null;
    this.jourAjoutPlage = horaire.jour;
    this.ajoutPlageData = {
      plage: this.buildPlageLabel(horaire),
      groupe: horaire.groupe || '',
      adresse: horaire.adresse || '',
      codePostal: horaire.codePostal || '',
      ville: horaire.ville || '',
      memeAdresse: false
    };
    this.showAjoutPlageModal = true;
  }

  closeAjoutPlageModal() {
    this.showAjoutPlageModal = false;
    this.jourAjoutPlage = '';
    this.editingHoraireId = null;
    this.ajoutPlageData = this.emptyPlage();
  }

  submitAjoutPlageModal() {
    if (!this.selectedClubId || !this.isPlageComplete(this.ajoutPlageData)) return;

    const horaire = this.toHorairePayload(this.jourAjoutPlage, this.ajoutPlageData);
    const request = this.editingHoraireId
      ? this.horairesService.updateHoraire(this.editingHoraireId, horaire)
      : this.horairesService.addHoraireToClub(this.selectedClubId, horaire);

    request.subscribe({
      next: () => {
        this.loadHoraires();
        this.closeAjoutPlageModal();
      },
      error: (err) => console.error('Erreur sauvegarde horaire:', err)
    });
  }

  get ajoutFormValid() {
    if (!this.ajoutJour) return false;
    return this.ajoutPlages.every(plage => this.isPlageComplete(plage));
  }

  addPlageForm() {
    this.ajoutPlages.push(this.emptyPlage());
    this.openedPlageIndex = this.ajoutPlages.length - 1;
  }

  removePlageForm(index: number) {
    if (this.ajoutPlages.length <= 1) return;

    this.ajoutPlages.splice(index, 1);
    if (this.editingPlageIndex === index) {
      this.editingPlageIndex = null;
    }
    this.openedPlageIndex = Math.min(this.openedPlageIndex, this.ajoutPlages.length - 1);
  }

  onMemeAdresseChange(plage: PlageForm, ajoutPlages: PlageForm[]) {
    if (plage.memeAdresse) {
      plage.adresse = ajoutPlages[0]?.adresse || '';
      plage.codePostal = ajoutPlages[0]?.codePostal || '';
      plage.ville = ajoutPlages[0]?.ville || '';
      return;
    }

    plage.adresse = '';
    plage.codePostal = '';
    plage.ville = '';
  }

  editPlageForm(index: number) {
    this.openedPlageIndex = index;
    this.editingPlageIndex = index;
  }

  saveEditPlageForm() {
    this.editingPlageIndex = null;
  }

  addHoraire() {
    if (!this.ajoutFormValid || !this.selectedClubId) return;

    const requests = this.ajoutPlages.map(plage => {
      const horaire = this.toHorairePayload(this.ajoutJour, plage);
      return this.horairesService.addHoraireToClub(this.selectedClubId as number, horaire);
    });

    Promise.all(requests.map(obs => obs.toPromise())).then(() => {
      this.loadHoraires();
      this.showAjoutModal = false;
      this.resetAjoutForm();
    });
  }

  addHoraireInline(jourBlock: any) {
    const plage: PlageForm = {
      plage: jourBlock.newPlage || '',
      groupe: jourBlock.newGroupe || '',
      adresse: jourBlock.newAdresse || '',
      codePostal: jourBlock.newCodePostal || '',
      ville: jourBlock.newVille || ''
    };

    if (!this.selectedClubId || !this.isPlageComplete(plage)) return;

    const horaire = this.toHorairePayload(jourBlock.jour, plage);
    this.horairesService.addHoraireToClub(this.selectedClubId, horaire).subscribe({
      next: () => {
        this.loadHoraires();
        jourBlock.showAddForm = false;
      },
      error: (err) => console.error('Erreur ajout horaire inline:', err)
    });
  }

  resetAjoutForm() {
    this.ajoutJour = '';
    this.ajoutPlages = [this.emptyPlage()];
    this.openedPlageIndex = 0;
    this.editingPlageIndex = null;
  }

  deleteHoraire(horaireId: number) {
    this.horairesService.deleteHoraire(horaireId).subscribe(() => {
      this.loadHoraires();
    });
  }

  get selectedClubName(): string {
    const club = this.clubs.find(c => Number(c.id) === Number(this.selectedClubId));
    return club?.nom || club?.name || 'Club';
  }

  get totalHoraires(): number {
    return this.horaires.length;
  }

  get totalJoursActifs(): number {
    return this.horairesParJour.filter(jour => jour.horaires.length > 0).length;
  }

  get totalGroupes(): number {
    return new Set(this.horaires.map(h => this.normalize(h.groupe)).filter(Boolean)).size;
  }

  get horairesCountLabel(): string {
    return this.totalHoraires === 1 ? '1 créneau publié' : `${this.totalHoraires} créneaux publiés`;
  }

  get modalPlageTitle(): string {
    return this.editingHoraireId ? 'Modifier le créneau' : 'Ajouter un créneau';
  }

  getJourCountLabel(jourBlock: { horaires: any[] }): string {
    const count = jourBlock?.horaires?.length || 0;
    return count === 1 ? '1 créneau' : `${count} créneaux`;
  }

  buildPlageLabel(horaire: any): string {
    if (horaire?.plage) return horaire.plage;
    if (horaire?.heureDebut && horaire?.heureFin) return `${horaire.heureDebut} - ${horaire.heureFin}`;
    return '';
  }

  getAdresseLabel(horaire: any): string {
    return [horaire?.adresse, horaire?.codePostal, horaire?.ville].filter(Boolean).join(' ');
  }

  private buildWeek(horaires: any[]): Array<{ jour: string; horaires: any[] }> {
    const map = new Map<string, any[]>();
    horaires.forEach(horaire => {
      if (!map.has(horaire.jour)) map.set(horaire.jour, []);
      map.get(horaire.jour)!.push(horaire);
    });

    return this.joursSemaine.map(jour => ({
      jour,
      horaires: (map.get(jour) || []).sort((a, b) => this.getMinutes(a) - this.getMinutes(b))
    }));
  }

  private toHorairePayload(jour: string, plage: PlageForm): any {
    const [heureDebut, heureFin] = this.parsePlage(plage.plage);
    return {
      jour,
      plage: plage.plage,
      heureDebut,
      heureFin,
      groupe: plage.groupe,
      adresse: plage.adresse,
      codePostal: plage.codePostal,
      ville: plage.ville,
      clubId: this.selectedClubId
    };
  }

  private parsePlage(plage: string): [string, string] {
    if (!plage.includes('-')) return ['', ''];
    const parts = plage.split('-');
    return [parts[0].trim(), parts[1].trim()];
  }

  private getMinutes(horaire: any): number {
    const value = String(horaire?.heureDebut || horaire?.plage || '');
    const match = value.match(/(\d{1,2})h(?:(\d{2}))?/);
    if (!match) return 9999;
    return Number(match[1]) * 60 + Number(match[2] || 0);
  }

  private emptyPlage(): PlageForm {
    return { plage: '', groupe: '', adresse: '', codePostal: '', ville: '', memeAdresse: false };
  }

  private isPlageComplete(plage: PlageForm): boolean {
    return !!(plage.plage && plage.groupe && plage.adresse && plage.codePostal && plage.ville);
  }

  private normalize(value: any): string {
    return String(value || '').trim().toLowerCase();
  }
}
