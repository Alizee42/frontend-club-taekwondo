import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembreService, Membre } from '../../services/membre.service';
import { AuthService, Utilisateur } from '../../services/auth.service';
import { ClubService, Club } from '../../services/club.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { MembresSuperAdminFormComponent } from './membres-super-admin-form.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

@Component({
  selector: 'app-membres-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, UiTableComponent, MembresSuperAdminFormComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './membres-super-admin.component.html',
  styleUrls: ['./membres-super-admin.component.css']
})
export class MembresSuperAdminComponent implements OnInit {
  membres: Membre[] = [];
  loading = false;
  error: string | null = null;
  clubs: Club[] = [];
  selectedClubId: number | null = null;

  get nbMembres() { return this.membres.length; }
  get nbClubs()   { return this.clubs.length; }
  showModal = false;
  modalMode: 'ajout' | 'edition' = 'ajout';
  membreEnCours: Partial<Membre> = {};
  columns = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'id', label: 'ID' }
  ];
  actions = [
    { label: 'Éditer', icon: 'ri-edit-2-line', action: 'edit', color: '#2563eb' },
    { label: 'Supprimer', icon: 'ri-delete-bin-6-line', action: 'delete', color: '#e53935' }
  ];

  exportCSV(): void {
    if (!this.membres.length) return;
    const header = ['Nom', 'Prénom', 'Date de naissance', 'Ceinture'];
    const rows = this.membres.map(m => [
      m.nom ?? '', m.prenom ?? '', m.dateNaissance ?? '', m.ceinture ?? ''
    ]);
    const csv = [header, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'membres.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  constructor(private membreService: MembreService, private authService: AuthService, private clubService: ClubService) {}

  ngOnInit(): void {
    this.loading = true;
    const utilisateur: Utilisateur | null = this.authService.getUtilisateurConnecte();
    const clubId = utilisateur?.['clubId'];
    // Un SUPER_ADMIN ne doit jamais être verrouillé sur un club, même si son compte
    // a un clubId renseigné (ex: comptes de seed) — seul le rôle fait foi ici.
    const role = (utilisateur?.['role'] ?? this.authService.getRole() ?? '').toString().toUpperCase();

    if (clubId && role !== 'SUPER_ADMIN') {
      this.selectedClubId = clubId;
      this.loadMembresForClub(clubId);
      return;
    }

    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = "Impossible de charger la liste des clubs.";
        this.loading = false;
      }
    });
  }

  openAjoutModal() {
    this.modalMode = 'ajout';
    this.membreEnCours = { nom: '', prenom: '' };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.membreEnCours = {};
  }

  onTableAction(event: { action: string, row: any }) {
    if (event.action === 'edit') this.openEditModal(event.row);
    if (event.action === 'delete') this.deleteMembre(event.row);
  }

  openEditModal(membre: Membre) {
    this.modalMode = 'edition';
    this.membreEnCours = { ...membre };
    this.showModal = true;
  }

  onSubmitForm(membre: Partial<Membre>) {
    if (!this.selectedClubId || !membre.nom || !membre.prenom) return;
    if (this.modalMode === 'ajout') {
      this.membreService.addMembreToClub(this.selectedClubId, membre).subscribe({
        next: () => { this.loadMembresForClub(this.selectedClubId!); this.closeModal(); },
        error: (err) => { this.error = "Erreur lors de l'ajout du membre."; }
      });
    } else {
      this.membreService.updateMembre(membre).subscribe({
        next: () => { this.loadMembresForClub(this.selectedClubId!); this.closeModal(); },
        error: (err) => { this.error = "Erreur lors de la modification du membre."; }
      });
    }
  }

  deleteMembre(membre: Membre) {
    if (!membre.id) return;
    if (confirm('Voulez-vous vraiment supprimer ce membre ?')) {
      this.membreService.deleteMembre(membre.id).subscribe({
        next: () => this.loadMembresForClub(this.selectedClubId!),
        error: () => { this.error = "Erreur lors de la suppression du membre."; }
      });
    }
  }

  onSelectClub(clubId: number|null) {
    this.selectedClubId = clubId;
    if (clubId) this.loadMembresForClub(clubId);
    else this.membres = [];
  }

  private loadMembresForClub(clubId: number|string) {
    this.loading = true;
    this.error = null;
    this.membreService.getMembresParClub(clubId).subscribe({
      next: (membres) => {
        this.membres = membres || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = "Erreur lors du chargement des membres.";
        this.loading = false;
      }
    });
  }
}
