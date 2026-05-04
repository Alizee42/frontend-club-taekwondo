import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActualiteService } from '../../services/actualite.service';
import { ClubService, Club } from '../../services/club.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { UiFormComponent } from '../../shared/ui/form/ui-form.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

interface Actualite {
  id?: string;
  titre: string;
  contenu: string;
  typeActu: string;
  datePublication: string;
  isFeatured?: boolean;
  imageUrl?: string;
  clubId?: string;
}

@Component({
  selector: 'app-actualites-super-admin',
  standalone: true,
  templateUrl: './actualites-super-admin.component.html',
  styleUrls: ['./actualites-super-admin.component.css'],
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, UiTableComponent, UiFormComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent]
})
export class ActualitesSuperAdminComponent implements OnInit {
  actualites: Actualite[] = [];
  clubs: Club[] = [];
  clubIdSelectionne: number | null = null;
  loading = false;
  error: string | null = null;

  get nbActualites() { return this.actualites.length; }
  get nbALaUne()     { return this.actualites.filter(a => a.isFeatured).length; }
  get nbEvenements() { return this.actualites.filter(a => a.typeActu === 'evenement').length; }
  isModalOpen = false;
  searchTerm: string = '';
  actualite: Actualite = this.getEmptyActualite();
  private clubSub: any;

  constructor(
    private actualiteService: ActualiteService,
    private clubService: ClubService
  ) {}

  fields = [
    { name: 'titre', label: 'Titre', type: 'text', required: true, placeholder: 'Titre de l\'actualité' },
    { name: 'typeActu', label: 'Type', type: 'select', required: true, options: [
      { value: 'evenement', label: 'Événement' },
      { value: 'competition', label: 'Compétition' },
      { value: 'annonce', label: 'Annonce' }
    ] },
    { name: 'contenu', label: 'Contenu', type: 'textarea', required: true, placeholder: 'Contenu de l\'actualité' },
    { name: 'complement', label: 'Complément (lien, info, PDF...)', type: 'text', required: false, placeholder: 'Lien, info ou document complémentaire' },
    { name: 'image', label: 'Image', type: 'file', required: false, onChange: this.onImageChange.bind(this) },
    { name: 'isFeatured', label: 'À la une', type: 'checkbox', required: false }
  ];

  imageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  onImageChange(event: any) {
    const file = event.target.files && event.target.files[0];
    this.imageFile = file || null;
    if (this.imageFile) {
      const reader = new FileReader();
      reader.onload = (e: any) => { this.imagePreviewUrl = e.target.result; };
      reader.readAsDataURL(this.imageFile);
    } else {
      this.imagePreviewUrl = null;
    }
  }

  get fieldsWithoutFeatured() { return this.fields; }

  columns = [
    { key: 'imageUrl',        label: 'Image',    type: 'image' as const, cellClass: 'col-img',      width: '90px' },
    { key: 'titre',           label: 'Titre',    type: 'text' as const,  cellClass: 'col-titre',    width: '320px' },
    { key: 'typeActu',        label: 'Type',     type: 'text' as const,  cellClass: 'col-type',     width: '70px' },
    { key: 'complement',      label: 'Complément', type: 'text' as const, cellClass: 'col-complement', width: '120px' },
    { key: 'datePublication', label: 'Date',     type: 'date' as const,  cellClass: 'col-date',     width: '80px', render: (row: any) => new Date(row.datePublication).toLocaleDateString() },
    { key: 'isFeatured',      label: 'À la une', type: 'text' as const,  cellClass: 'col-featured td-center', width: '80px', render: (row: any) => row.isFeatured ? '⭐ Oui' : 'Non', headerClass: 'th-featured-center' }
  ];

  actions = [
    { label: 'Mettre à la une', icon: 'ri-star-line',       action: 'feature', variant: 'primary' as const, show: (row: any) => !row.isFeatured },
    { label: 'Modifier',        icon: 'ri-edit-line',       action: 'edit',    variant: 'primary' as const },
    { label: 'Supprimer',       icon: 'ri-delete-bin-line', action: 'delete',  variant: 'danger'  as const }
  ];

  ngOnInit(): void {
    this.loading = true;
    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs || [];
        const sel = this.clubService.getSelectedClub();
        if (sel && sel.id) {
          this.clubIdSelectionne = sel.id;
          this.loadActualitesClub();
        } else if (this.clubs.length > 0) {
          this.clubIdSelectionne = this.clubs[0].id;
          this.loadActualitesClub();
        }
        this.loading = false;
      },
      error: () => {
        this.clubs = [];
        this.error = 'Impossible de charger les clubs.';
        this.loading = false;
      }
    });
    this.clubSub = this.clubService.selectedClub$.subscribe(club => {
      if (club && club.id && club.id !== this.clubIdSelectionne) {
        this.clubIdSelectionne = club.id;
        this.loadActualitesClub();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.clubSub) this.clubSub.unsubscribe();
  }

  loadActualitesClub(): void {
    if (!this.clubIdSelectionne) return;
    this.loading = true;
    this.actualiteService.getActualitesByClub(this.clubIdSelectionne).subscribe({
      next: (data: Actualite[]) => {
        const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
        this.actualites = (Array.isArray(data) ? data : []).map(actu => {
          let raw = actu.imageUrl || '';
          if (raw.startsWith('actualites/')) raw = raw.replace(/^actualites\//, '');
          let full = '';
          if (!raw) {
            full = '';
          } else if (raw.startsWith('http') || raw.startsWith('data:image')) {
            full = raw;
          } else {
            full = `${apiBase}/uploads/actualites/${encodeURIComponent(raw)}`;
          }
          return { ...actu, imageUrl: full };
        });
        this.loading = false;
      },
      error: () => {
        this.actualites = [];
        this.loading = false;
        this.error = 'Impossible de charger les actualités du club.';
      }
    });
  }

  onClubChange(): void {
    this.loadActualitesClub();
  }

  filteredActualites(): Actualite[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.actualites;
    return this.actualites.filter(actu =>
      actu.titre.toLowerCase().includes(term) ||
      actu.typeActu.toLowerCase().includes(term)
    );
  }

  openModal(actu?: Actualite): void {
    this.actualite = actu ? { ...actu } : this.getEmptyActualite();
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.actualite = this.getEmptyActualite();
    this.imageFile = null;
    this.imagePreviewUrl = null;
  }

  onTableAction(event: { action: string; row: Actualite }): void {
    if (event.action === 'edit') {
      this.openModal(event.row);
    } else if (event.action === 'delete') {
      this.deleteActualite(event.row.id!);
    } else if (event.action === 'feature') {
      this.setFeatured(event.row);
    }
  }

  onSubmitForm(formValue: any): void {
    formValue.clubId = String(this.clubIdSelectionne);
    formValue.datePublication = new Date().toISOString();
    let request$;
    if (this.imageFile) {
      const formData = new FormData();
      Object.keys(formValue).forEach(key => formData.append(key, formValue[key]));
      formData.append('image', this.imageFile);
      formData.set('clubId', String(this.clubIdSelectionne));
      request$ = formValue.id
        ? this.actualiteService.updateMultipart(formValue.id, formData)
        : this.actualiteService.createMultipart(formData);
    } else {
      request$ = formValue.id
        ? this.actualiteService.update(formValue.id, formValue)
        : this.actualiteService.create(formValue);
    }
    request$.subscribe({
      next: () => {
        this.loadActualitesClub();
        this.closeModal();
      },
      error: () => {
        this.error = 'Erreur lors de l\'enregistrement de l\'actualité.';
      }
    });
  }

  deleteActualite(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer cette actualité ?')) {
      this.actualiteService.delete(id).subscribe(() => this.loadActualitesClub());
    }
  }

  setFeatured(actu: Actualite): void {
    this.actualiteService.setFeatured(actu).subscribe({
      next: () => this.loadActualitesClub(),
      error: () => { this.error = 'Une erreur est survenue lors de la mise à la une.'; }
    });
  }

  private getEmptyActualite(): Actualite {
    return {
      titre: '',
      contenu: '',
      typeActu: '',
      datePublication: new Date().toISOString(),
      isFeatured: false,
      imageUrl: '',
      clubId: this.clubIdSelectionne ? String(this.clubIdSelectionne) : undefined
    };
  }
}
