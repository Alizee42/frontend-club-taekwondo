import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvisService, Avis } from '../../services/avis.service';
import { ClubService, Club } from '../../services/club.service';
import { Subscription } from 'rxjs';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiFormComponent } from '../../shared/ui/form/ui-form.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

@Component({
  selector: 'app-avis-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, UiTableComponent, UiFormComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './avis-super-admin.component.html',
  styleUrls: ['./avis-super-admin.component.css']
})
export class AvisSuperAdminComponent implements OnInit {
  avis: Avis[] = [];
  clubs: Club[] = [];
  selectedClubId: number|null = null;
  loading = false;
  error: string|null = null;

  get nbAvis()      { return this.avis.length; }
  get nbApprouves() { return this.avis.filter(a => a.approuve === true).length; }
  get nbEnAttente() { return this.avis.filter(a => a.approuve !== true).length; }
  get noteMoyenne() {
    if (!this.avis.length) return '—';
    return (this.avis.reduce((s, a) => s + (a.note || 0), 0) / this.avis.length).toFixed(1) + ' / 5';
  }
  showModal = false;
  modalMode: 'ajout'|'edition' = 'ajout';
  avisEnCours: Partial<Avis> = {};
  fields = [
    { name: 'pseudoVisiteur', label: 'Nom', type: 'text', required: true, placeholder: "Nom du visiteur" },
    { name: 'contenu', label: 'Contenu', type: 'text', required: true, placeholder: "Votre avis" }
  ];
  columns = [
    { key: 'pseudoVisiteur', label: 'Nom' },
    { key: 'contenu', label: 'Contenu' },
    { key: 'note', label: 'Note' },
    { key: 'typeAvis', label: 'Sujet' },
    { key: 'approuve', label: 'Approuvé', render: (row: any) => {
        if (row == null || row.approuve == null) return 'En attente';
        return row.approuve ? 'Oui' : 'Non';
      }
    }
  ];

  actions: Array<{ label: string; icon?: string; action: string; color?: string; variant?: 'primary'|'secondary'|'danger'|'ghost'; disabled?: boolean; customClass?: string; show?: (row: any) => boolean }> = [
    { label: 'Approuver', icon: 'ri-check-line', action: 'approve', color: '#16a34a', variant: 'primary', show: (r: any) => !r?.approuve },
    // Le bouton 'Refuser' reste toujours disponible (possibilité de suppression future)
    { label: 'Refuser', icon: 'ri-close-line', action: 'refuse', color: '#d32f2f', variant: 'danger' }
  ];
  clubSelectFields = [
    { name: 'club', label: 'Sélectionner un club', type: 'select', required: true, options: [] as { value: number, label: string }[] }
  ];
  clubSelectModel: { club: number | null } = { club: null };
  private subs: Subscription[] = [];

  constructor(private avisService: AvisService, private clubService: ClubService) {}

  ngOnInit(): void {
    this.loading = true;
    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs || [];
        this.clubSelectFields[0].options = this.clubs.map(c => ({ value: c.id, label: c.nom }));
        // Synchronise le modèle avec la sélection actuelle
        // Si un club est déjà sélectionné dans le service (localStorage), l'utiliser
        const sel = this.clubService.getSelectedClub();
        if (sel && sel.id) {
          this.selectedClubId = sel.id;
          this.clubSelectModel.club = this.selectedClubId;
          this.loadAvisForClub(this.selectedClubId);
        } else if (this.selectedClubId) {
          this.clubSelectModel.club = this.selectedClubId;
        }
        // S'abonner aux changements globaux de sélection de club
        this.subs.push(this.clubService.selectedClub$.subscribe(club => {
          if (club && club.id) {
            // si la sélection a changé ailleurs, recharger les avis pour ce club
            if (club.id !== this.selectedClubId) {
              this.selectedClubId = club.id;
              this.clubSelectModel.club = this.selectedClubId;
              this.loadAvisForClub(this.selectedClubId);
            }
          } else {
            // pas de club sélectionné
            this.selectedClubId = null;
            this.clubSelectModel.club = null;
            this.avis = [];
          }
        }));
        this.loading = false;
      },
      error: () => {
        this.error = "Impossible de charger les clubs.";
        this.loading = false;
      }
    });
  }

  onSelectClub(clubId: number|null) {
    // NE PAS persister la sélection globalement ici : la sélection ne doit
    // affecter que le tableau d'avis local (pas toute la page).
    this.selectedClubId = clubId;
    this.clubSelectModel.club = clubId;
    if (clubId) {
      this.loadAvisForClub(clubId);
    } else {
      this.avis = [];
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadAvisForClub(clubId: number|string) {
    console.debug('[AvisSuperAdmin] loadAvisForClub clubId=', clubId);
    this.loading = true;
    this.error = null;
    this.avisService.getAvisParClub(clubId).subscribe({
      next: (avis) => {
        this.avis = avis || [];
        this.loading = false;
      },
      error: () => {
        this.error = "Erreur lors du chargement des avis.";
        this.loading = false;
      }
    });
  }

  openAjoutModal() {
    this.modalMode = 'ajout';
    this.avisEnCours = { pseudoVisiteur: '', contenu: '' };
    this.showModal = true;
  }

  openEditModal(avis: Avis) {
    this.modalMode = 'edition';
    this.avisEnCours = { ...avis };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.avisEnCours = {};
  }

  onTableAction(event: { action: string, row: any }) {
    console.debug('[AvisSuperAdmin] onTableAction', event);
    const action = event.action;
    const id = event.row?.id;
    if (!id) {
      console.warn('[AvisSuperAdmin] action without id', event);
      return;
    }
    if (action === 'approve') this.approuverAvis(id);
    else if (action === 'refuse') this.refuserAvis(id);
  }

  onSubmitForm(formValue: any) {
    // Désactivé: édition non autorisée depuis cette vue
    if (!this.selectedClubId || !formValue.pseudoVisiteur || !formValue.contenu) return;
    // Ajout d'avis par super-admin (optionnel)
    if (this.modalMode === 'ajout') {
      this.avisService.addAvisToClub(this.selectedClubId, formValue).subscribe({
        next: () => {
          this.loadAvisForClub(this.selectedClubId!);
          this.closeModal();
        },
        error: () => {
          this.error = "Erreur lors de l'ajout de l'avis.";
        }
      });
    }
  }

  deleteAvis(avis: Avis) {
    // suppression désactivée depuis cette vue selon la règle métier
    console.warn('[AvisSuperAdmin] Suppression désactivée dans cette vue.');
  }

  approuverAvis(id: number) {
    if (!id) return;
    console.debug('[AvisSuperAdmin] approuverAvis id=', id);
    this.avisService.approuverAvis(id).subscribe({
      next: (res) => {
        console.debug('[AvisSuperAdmin] approuverAvis success', res);
        if (this.selectedClubId) this.loadAvisForClub(this.selectedClubId);
      },
      error: (err) => {
        console.error('[AvisSuperAdmin] approuverAvis error', err);
        this.error = 'Impossible d\'approuver cet avis. Veuillez réessayer.';
      }
    });
  }

  refuserAvis(id: number) {
    if (!id) return;
    if (!confirm('Voulez-vous vraiment refuser / supprimer cet avis ?')) return;
    console.debug('[AvisSuperAdmin] refuserAvis id=', id);
    this.avisService.refuserAvis(id).subscribe({
      next: (res) => {
        console.debug('[AvisSuperAdmin] refuserAvis success', res);
        if (this.selectedClubId) this.loadAvisForClub(this.selectedClubId);
      },
      error: (err) => {
        console.error('[AvisSuperAdmin] refuserAvis error', err);
        this.error = 'Impossible de refuser cet avis. Veuillez réessayer.';
      }
    });
  }

  // Gestion des événements DOM natifs pour ui-table
  onEditEvent(event: Event | CustomEvent | any) {
    let row: any = null;
    if (event && 'detail' in event) row = (event as CustomEvent).detail;
    else row = event;
    if (row) this.openEditModal(row);
  }
  onDeleteEvent(event: Event | CustomEvent | any) {
    let row: any = null;
    if (event && 'detail' in event) row = (event as CustomEvent).detail;
    else row = event;
    if (row) this.deleteAvis(row);
  }
  // Gestion de l'événement DOM natif pour ui-modal
  onModalOpenChange(event: Event | CustomEvent | any) {
    if (typeof event === 'boolean') {
      this.showModal = event;
    } else if (event && 'detail' in event && typeof (event as CustomEvent).detail === 'boolean') {
      this.showModal = (event as CustomEvent).detail;
    } else if (event && event.target && typeof (event.target as any).open === 'boolean') {
      this.showModal = (event.target as any).open;
    } else {
      this.showModal = false;
    }
  }
}