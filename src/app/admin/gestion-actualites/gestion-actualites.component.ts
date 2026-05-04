import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActualiteService } from '../../services/actualite.service';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
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
  clubId?: number;
}

@Component({
  selector: 'app-gestion-actualites',
  standalone: true,
  templateUrl: './gestion-actualites.component.html',
  styleUrls: ['./gestion-actualites.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    UiTableComponent,
    UiButtonComponent,
    UiModalComponent,
    PageHeaderComponent,
    KpiCardComponent,
    KpiGridComponent
  ]
})
export class GestionActualitesComponent implements OnInit {
  actualites: Actualite[] = [];
  featuredNews: Actualite | null = null;

  get nbActualites()   { return this.actualites.length; }
  get nbALaUne()       { return this.actualites.filter(a => a.isFeatured).length; }
  get nbEvenements()   { return this.actualites.filter(a => a.typeActu === 'evenement').length; }
  imageUrl: string | ArrayBuffer | null = null;
  imageFile: File | null = null;
  imageError = '';
  searchTerm = '';
  typeFilter = '';
  featuredOnly = false;
  isModalOpen = false;
  actualite: Actualite = {
    titre: '',
    contenu: '',
    typeActu: '',
    datePublication: new Date().toISOString(),
    isFeatured: false,
    imageUrl: ''
  };

  readonly typeOptions = [
    { value: 'evenement', label: 'Evenement' },
    { value: 'competition', label: 'Competition' },
    { value: 'annonce', label: 'Annonce' }
  ];

  readonly columns: UiTableColumn[] = [
    { key: 'imageUrl', label: 'Image', type: 'image', cellClass: 'col-image', width: '96px' },
    { key: 'titre', label: 'Titre', type: 'text', cellClass: 'col-title', width: '320px' },
    {
      key: 'typeActu',
      label: 'Type',
      type: 'text',
      cellClass: 'col-type',
      width: '150px',
      display: (row: Actualite) => this.getTypeLabel(row.typeActu)
    },
    {
      key: 'datePublication',
      label: 'Publication',
      type: 'text',
      cellClass: 'col-date',
      width: '140px',
      display: (row: Actualite) => this.formatDate(row.datePublication)
    },
    {
      key: 'isFeatured',
      label: 'A la une',
      type: 'text',
      cellClass: 'col-featured td-center',
      headerClass: 'th-center',
      width: '140px',
      display: (row: Actualite) => row.isFeatured ? 'Oui' : 'Non'
    }
  ];

  readonly actions = [
    { label: 'Mettre a la une', icon: 'ri-star-line', action: 'feature', variant: 'secondary' as const, title: 'Mettre a la une', show: (row: Actualite) => !row.isFeatured },
    { label: 'Modifier', icon: 'ri-edit-line', action: 'edit', variant: 'primary' as const, title: 'Modifier' },
    { label: 'Supprimer', icon: 'ri-delete-bin-line', action: 'delete', variant: 'danger' as const, title: 'Supprimer' }
  ];

  constructor(
    private readonly actualiteService: ActualiteService,
    private readonly authService: AuthService
  ) {
    this.actualite = this.getEmptyActualite();
  }

  ngOnInit(): void {
    this.loadActualites();
  }

  onTableAction(event: { action: string; row: Actualite }): void {
    if (event.action === 'edit') {
      this.openModal(event.row);
      return;
    }

    if (event.action === 'delete' && event.row.id) {
      this.deleteActualite(event.row.id);
      return;
    }

    if (event.action === 'feature') {
      this.setFeatured(event.row);
    }
  }

  filteredActualites(): Actualite[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.actualites.filter((actu) => {
      const matchesSearch = !term || [actu.titre, actu.typeActu, actu.contenu]
        .filter((value): value is string => !!value)
        .some((value) => value.toLowerCase().includes(term));
      const matchesType = !this.typeFilter || actu.typeActu === this.typeFilter;
      const matchesFeatured = !this.featuredOnly || actu.isFeatured === true;

      return matchesSearch && matchesType && matchesFeatured;
    });
  }

  openModal(actu?: Actualite): void {
    this.actualite = actu ? { ...actu } : this.getEmptyActualite();
    this.imageUrl = actu?.imageUrl || null;
    this.imageError = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.resetForm();
  }

  onSubmit(): void {
    const payload: Actualite = {
      ...this.actualite,
      clubId: this.actualite.clubId ?? this.getClubId() ?? undefined,
      datePublication: this.actualite.id
        ? (this.actualite.datePublication || new Date().toISOString())
        : new Date().toISOString()
    };

    const request$ = this.imageFile
      ? this.saveWithImage(payload)
      : payload.id
        ? this.actualiteService.update(payload.id, payload)
        : this.actualiteService.create(payload);

    request$.subscribe({
      next: () => {
        this.loadActualites();
        this.closeModal();
      },
      error: () => {
        this.imageError = 'Erreur lors de l\'enregistrement de l\'actualite.';
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      this.imageError = '';
      this.imageFile = null;
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Veuillez selectionner une image valide.';
      this.imageUrl = null;
      this.imageFile = null;
      return;
    }

    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = reader.result;
      this.imageError = '';
    };
    reader.readAsDataURL(file);
  }

  editActualite(actu: Actualite): void {
    this.openModal(actu);
  }

  deleteActualite(id: string): void {
    if (!confirm('Voulez-vous vraiment supprimer cette actualite ?')) {
      return;
    }

    this.actualiteService.delete(id).subscribe(() => {
      this.loadActualites();
    });
  }

  setFeatured(actu: Actualite): void {
    if (this.featuredNews?.id === actu.id) {
      alert('Cette actualite est deja a la une.');
      return;
    }

    this.actualiteService.setFeatured(actu).subscribe({
      next: () => this.loadActualites(),
      error: () => {
        alert('Une erreur est survenue lors de la mise a la une.');
      }
    });
  }

  private loadActualites(): void {
    const clubId = this.getClubId();

    if (!clubId) {
      this.actualites = [];
      this.featuredNews = null;
      return;
    }

    this.actualiteService.getActualitesByClub(clubId).subscribe({
      next: (data: Actualite[]) => {
        this.actualites = data || [];
        this.updateFeaturedNews();
      },
      error: () => {
        this.actualites = [];
        this.featuredNews = null;
      }
    });
  }

  private updateFeaturedNews(): void {
    this.featuredNews = this.actualites.find((item) => item.isFeatured === true) || null;
  }

  private resetForm(): void {
    this.actualite = this.getEmptyActualite();
    this.imageUrl = null;
    this.imageFile = null;
    this.imageError = '';
  }

  private saveWithImage(payload: Actualite) {
    const formData = new FormData();

    formData.append('titre', payload.titre);
    formData.append('contenu', payload.contenu);
    formData.append('typeActu', payload.typeActu);
    formData.append('isFeatured', String(!!payload.isFeatured));
    formData.append('clubId', String(payload.clubId ?? this.getClubId() ?? ''));

    if (this.imageFile) {
      formData.append('image', this.imageFile);
    }

    return payload.id
      ? this.actualiteService.updateMultipart(payload.id, formData)
      : this.actualiteService.createMultipart(formData);
  }

  private getEmptyActualite(): Actualite {
    return {
      titre: '',
      contenu: '',
      typeActu: '',
      datePublication: new Date().toISOString(),
      isFeatured: false,
      imageUrl: '',
      clubId: this.getClubId() ?? undefined
    };
  }

  private getClubId(): number | null {
    const utilisateur = this.authService.getUtilisateurConnecte() as any;

    if (!utilisateur) {
      return null;
    }

    return utilisateur?.club?.id
      ?? utilisateur?.clubId
      ?? (Array.isArray(utilisateur?.clubs) && utilisateur.clubs[0]?.id ? utilisateur.clubs[0].id : null);
  }

  private getTypeLabel(typeActu: string): string {
    return this.typeOptions.find((option) => option.value === typeActu)?.label || typeActu || '-';
  }

  private formatDate(dateValue: string): string {
    return dateValue ? new Date(dateValue).toLocaleDateString('fr-FR') : '-';
  }
}
