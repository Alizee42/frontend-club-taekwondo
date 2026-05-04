import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvenementDTO, EvenementService } from '../../services/evenement.service';
import { AuthService } from '../../services/auth.service';
import { Inscription, InscriptionsService } from '../../services/inscriptions.service';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

type EventStatusFilter = '' | 'actif' | 'inactif';
type SortField = 'dateDebut' | 'titre' | 'nbInscrits';
type SortOrder = 'asc' | 'desc';

interface EventFormModel {
  titre: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  capacite: number;
  actif: boolean;
  imageFile: File | null;
  imageUrl: string;
}

@Component({
  selector: 'app-gestion-evenements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiButtonComponent,
    UiTableComponent,
    UiModalComponent,
    PageHeaderComponent,
    KpiCardComponent,
    KpiGridComponent
  ],
  templateUrl: './gestion-evenements.component.html',
  styleUrls: ['./gestion-evenements.component.css']
})
export class GestionEvenementsComponent implements OnInit {
  evenements: EvenementDTO[] = [];
  inscriptions: Inscription[] = [];
  evenementSelectionne: EvenementDTO | null = null;

  afficherFormulaire = false;
  isEditing = false;
  editingEventId: number | null = null;
  nouvelEvenement: EventFormModel = this.createEmptyEventForm();

  errorMsg = '';
  successMsg = '';
  isLoading = false;

  searchTerm = '';
  statusFilter: EventStatusFilter = '';
  sortBy: SortField = 'dateDebut';
  sortOrder: SortOrder = 'asc';

  readonly eventColumns: UiTableColumn[] = [
    { key: 'titre', label: 'Titre' },
    { key: 'dateDebut', label: 'Date debut' },
    { key: 'dateFin', label: 'Date fin' },
    { key: 'lieu', label: 'Lieu' },
    { key: 'capacite', label: 'Capacite' },
    { key: 'imageUrl', label: 'Image', type: 'image', width: '112px' },
    {
      key: 'statutLabel',
      label: 'Statut',
      display: (row: any) => row.statutLabel,
      textClass: (row: any) => row.statutClass
    },
    { key: 'nbInscrits', label: 'Inscrits' }
  ];

  readonly eventActions: Array<{
    label: string;
    icon?: string;
    action: string;
    color?: string;
    title?: string;
  }> = [
    { label: 'Modifier', icon: 'ri-edit-line', action: 'edit', color: '#2563eb', title: 'Modifier' },
    { label: 'Supprimer', icon: 'ri-delete-bin-7-line', action: 'delete', color: '#dc2626', title: 'Supprimer' },
    { label: 'Voir les inscrits', icon: 'ri-group-line', action: 'registrations', color: '#475569', title: 'Voir les inscrits' }
  ];

  readonly inscriptionColumns: UiTableColumn[] = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prenom' },
    { key: 'email', label: 'Email' },
    {
      key: 'statutLabel',
      label: 'Statut',
      display: (row: any) => row.statutLabel,
      textClass: (row: any) => row.statutClass
    }
  ];

  readonly inscriptionActions: Array<{
    label: string;
    icon?: string;
    action: string;
    color?: string;
    title?: string;
    show?: (row: any) => boolean;
  }> = [
    {
      label: 'Valider',
      icon: 'ri-checkbox-circle-line',
      action: 'approve',
      color: '#16a34a',
      title: 'Valider cette inscription',
      show: (row: any) => row.statut === 'EN_ATTENTE'
    },
    {
      label: 'Refuser',
      icon: 'ri-close-circle-line',
      action: 'reject',
      color: '#dc2626',
      title: 'Refuser cette inscription',
      show: (row: any) => row.statut === 'EN_ATTENTE'
    }
  ];

  constructor(
    private evenementService: EvenementService,
    private inscriptionsService: InscriptionsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  get totalEvenements(): number {
    return this.evenements.length;
  }

  get totalInscrits(): number {
    return this.evenements.reduce((acc, evenement) => acc + (evenement.nbInscrits || 0), 0);
  }

  get totalActifs(): number {
    return this.evenements.filter(e => e.actif).length;
  }

  get prochainEvenementDate(): string {
    const prochain = this.prochainEvenement;
    if (!prochain) return 'Aucun';
    return new Date(prochain.dateDebut).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  }

  get prochainEvenementMeta(): string {
    const prochain = this.prochainEvenement;
    return prochain ? prochain.titre : 'evenement a venir le plus proche';
  }

  get prochainEvenementTitre(): string {
    const prochain = this.prochainEvenement;
    return prochain ? prochain.titre : 'Aucun evenement a venir';
  }

  get inscriptionsActives(): Inscription[] {
    return this.inscriptions.filter((inscription) => inscription.statut !== 'ANNULEE');
  }

  get nbInscritsAttente(): number {
    return this.inscriptions.filter((inscription) => inscription.statut === 'EN_ATTENTE').length;
  }

  get filteredEvenements(): EvenementDTO[] {
    const term = this.searchTerm.trim().toLowerCase();

    const filtered = this.evenements.filter((evenement) => {
      const text = `${evenement.titre} ${evenement.lieu} ${evenement.description || ''}`.toLowerCase();
      const matchesSearch = !term || text.includes(term);
      const matchesStatus =
        !this.statusFilter ||
        (this.statusFilter === 'actif' && evenement.actif) ||
        (this.statusFilter === 'inactif' && !evenement.actif);

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => this.compareEvenements(a, b));
  }

  get eventTableRows(): any[] {
    return this.filteredEvenements.map((evenement) => ({
      __event: evenement,
      titre: evenement.titre,
      dateDebut: this.formatDate(evenement.dateDebut),
      dateFin: this.formatDate(evenement.dateFin),
      lieu: evenement.lieu,
      capacite: evenement.capacite,
      imageUrl: evenement.imageUrl || '',
      statutLabel: evenement.actif ? 'Actif' : 'Inactif',
      statutClass: evenement.actif ? 'status-chip status-chip--success' : 'status-chip status-chip--danger',
      nbInscrits: evenement.nbInscrits || 0
    }));
  }

  get inscriptionTableRows(): any[] {
    return this.inscriptionsActives.map((inscription) => ({
      __inscription: inscription,
      nom: this.resolveNom(inscription),
      prenom: this.resolvePrenom(inscription),
      email: this.resolveEmail(inscription),
      statut: inscription.statut || '',
      statutLabel: this.getInscriptionStatusLabel(inscription.statut),
      statutClass: this.getInscriptionStatusClass(inscription.statut)
    }));
  }

  chargerEvenements(): void {
    this.isLoading = true;
    this.clearMessages();

    this.evenementService.getEvenementsMonClub().subscribe({
      next: (evenements) => {
        this.evenements = evenements;

        if (this.evenementSelectionne) {
          const updated = this.evenements.find((evenement) => evenement.id === this.evenementSelectionne?.id) || null;
          this.evenementSelectionne = updated;
          if (!updated) {
            this.inscriptions = [];
          }
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMsg = error?.error?.error || 'Erreur lors du chargement des evenements.';
        this.isLoading = false;
      }
    });
  }

  ouvrirFormulaireCreation(): void {
    this.afficherFormulaire = true;
    this.isEditing = false;
    this.editingEventId = null;
    this.nouvelEvenement = this.createEmptyEventForm();
    this.clearMessages();
  }

  ouvrirEdition(evenement: EvenementDTO): void {
    this.afficherFormulaire = true;
    this.isEditing = true;
    this.editingEventId = evenement.id;
    this.nouvelEvenement = {
      titre: evenement.titre,
      description: evenement.description,
      dateDebut: this.formatDateForInput(evenement.dateDebut),
      dateFin: this.formatDateForInput(evenement.dateFin),
      lieu: evenement.lieu,
      capacite: evenement.capacite,
      actif: evenement.actif,
      imageFile: null,
      imageUrl: evenement.imageUrl || ''
    };
    this.clearMessages();
  }

  fermerFormulaire(): void {
    this.afficherFormulaire = false;
    this.isEditing = false;
    this.editingEventId = null;
    this.nouvelEvenement = this.createEmptyEventForm();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] || null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMsg = 'Veuillez selectionner une image valide.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg = 'L image ne doit pas depasser 5 MB.';
      return;
    }

    this.nouvelEvenement.imageFile = file;

    const reader = new FileReader();
    reader.onload = (loadEvent: ProgressEvent<FileReader>) => {
      this.nouvelEvenement.imageUrl = String(loadEvent.target?.result || '');
    };
    reader.readAsDataURL(file);
    this.clearMessages();
  }

  soumettreEvenement(): void {
    if (!this.validerFormulaire()) {
      return;
    }

    const formData = new FormData();
    formData.append('titre', this.nouvelEvenement.titre);
    formData.append('description', this.nouvelEvenement.description);
    formData.append('dateDebut', this.nouvelEvenement.dateDebut);
    formData.append('dateFin', this.nouvelEvenement.dateFin);
    formData.append('lieu', this.nouvelEvenement.lieu);
    formData.append('capacite', String(this.nouvelEvenement.capacite));
    formData.append('actif', String(this.nouvelEvenement.actif));

    if (this.nouvelEvenement.imageFile) {
      formData.append('image', this.nouvelEvenement.imageFile);
    }

    this.isLoading = true;
    this.clearMessages();

    const request$ = this.isEditing && this.editingEventId
      ? this.evenementService.modifierEvenement(this.editingEventId, formData)
      : this.evenementService.ajouterEvenement(formData);

    request$.subscribe({
      next: () => {
        this.successMsg = this.isEditing
          ? 'Evenement modifie avec succes.'
          : 'Evenement cree avec succes.';
        this.fermerFormulaire();
        this.chargerEvenements();
      },
      error: () => {
        this.errorMsg = this.isEditing
          ? 'Erreur lors de la modification de l evenement.'
          : 'Erreur lors de la creation de l evenement.';
        this.isLoading = false;
      }
    });
  }

  supprimerEvenement(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cet evenement ?')) {
      return;
    }

    this.clearMessages();
    this.evenementService.supprimerEvenement(id).subscribe({
      next: () => {
        this.successMsg = 'Evenement supprime avec succes.';

        if (this.evenementSelectionne?.id === id) {
          this.fermerInscriptions();
        }

        this.chargerEvenements();
      },
      error: () => {
        this.errorMsg = 'Erreur lors de la suppression de l evenement.';
      }
    });
  }

  selectionnerEvenement(evenement: EvenementDTO): void {
    this.evenementSelectionne = evenement;
    this.inscriptions = [];
    this.chargerInscriptions(evenement.id);
  }

  chargerInscriptions(evenementId: number): void {
    this.inscriptionsService.getInscriptionsByEvenement(evenementId).subscribe({
      next: (data) => {
        this.inscriptions = data;
      },
      error: () => {
        this.inscriptions = [];
      }
    });
  }

  validerInscription(inscription: Inscription): void {
    if (!inscription.id || !this.evenementSelectionne) {
      return;
    }

    this.inscriptionsService.updateStatut(inscription.id, 'VALIDEE').subscribe({
      next: () => {
        this.successMsg = 'Inscription validee.';
        this.chargerInscriptions(this.evenementSelectionne!.id);
        this.chargerEvenements();
      }
    });
  }

  refuserInscription(inscription: Inscription): void {
    if (!inscription.id || !this.evenementSelectionne) {
      return;
    }

    this.inscriptionsService.updateStatut(inscription.id, 'REFUSEE').subscribe({
      next: () => {
        this.successMsg = 'Inscription refusee.';
        this.chargerInscriptions(this.evenementSelectionne!.id);
        this.chargerEvenements();
      }
    });
  }

  fermerInscriptions(): void {
    this.evenementSelectionne = null;
    this.inscriptions = [];
  }

  onEventAction(event: { action: string; row: any }): void {
    const evenement = event.row?.__event as EvenementDTO | undefined;
    if (!evenement) {
      return;
    }

    if (event.action === 'edit') {
      this.ouvrirEdition(evenement);
      return;
    }

    if (event.action === 'delete') {
      this.supprimerEvenement(evenement.id);
      return;
    }

    if (event.action === 'registrations') {
      this.selectionnerEvenement(evenement);
    }
  }

  onInscriptionAction(event: { action: string; row: any }): void {
    const inscription = event.row?.__inscription as Inscription | undefined;
    if (!inscription) {
      return;
    }

    if (event.action === 'approve') {
      this.validerInscription(inscription);
      return;
    }

    if (event.action === 'reject') {
      this.refuserInscription(inscription);
    }
  }

  validerFormulaire(): boolean {
    if (!this.nouvelEvenement.titre.trim()) {
      this.errorMsg = 'Le titre est requis.';
      return false;
    }

    if (!this.nouvelEvenement.dateDebut) {
      this.errorMsg = 'La date de debut est requise.';
      return false;
    }

    if (!this.nouvelEvenement.dateFin) {
      this.errorMsg = 'La date de fin est requise.';
      return false;
    }

    if (new Date(this.nouvelEvenement.dateDebut) >= new Date(this.nouvelEvenement.dateFin)) {
      this.errorMsg = 'La date de fin doit etre apres la date de debut.';
      return false;
    }

    if (!this.nouvelEvenement.lieu.trim()) {
      this.errorMsg = 'Le lieu est requis.';
      return false;
    }

    if (this.nouvelEvenement.capacite < 1) {
      this.errorMsg = 'La capacite doit etre superieure a 0.';
      return false;
    }

    return true;
  }

  formatDateForInput(dateString: string): string {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatDate(dateString?: string): string {
    if (!dateString) {
      return '';
    }

    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  clearMessages(): void {
    this.errorMsg = '';
    this.successMsg = '';
  }

  private get prochainEvenement(): EvenementDTO | null {
    const now = new Date().getTime();
    const futurs = this.evenements
      .filter((evenement) => new Date(evenement.dateDebut).getTime() > now)
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());

    return futurs.length ? futurs[0] : null;
  }

  private compareEvenements(a: EvenementDTO, b: EvenementDTO): number {
    let comparison = 0;

    if (this.sortBy === 'titre') {
      comparison = a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' });
    } else if (this.sortBy === 'nbInscrits') {
      comparison = (a.nbInscrits || 0) - (b.nbInscrits || 0);
    } else {
      comparison = new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime();
    }

    return this.sortOrder === 'asc' ? comparison : -comparison;
  }

  private createEmptyEventForm(): EventFormModel {
    return {
      titre: '',
      description: '',
      dateDebut: '',
      dateFin: '',
      lieu: '',
      capacite: 0,
      actif: true,
      imageFile: null,
      imageUrl: ''
    };
  }

  private resolveNom(inscription: Inscription): string {
    return inscription.membreNom?.trim()
      || inscription.utilisateurNom?.trim()
      || (inscription.membreId ? `Membre #${inscription.membreId}` : 'Nom non disponible');
  }

  private resolvePrenom(inscription: Inscription): string {
    return inscription.membrePrenom?.trim()
      || inscription.utilisateurPrenom?.trim()
      || '';
  }

  private resolveEmail(inscription: Inscription): string {
    return inscription.membreEmail?.trim() || inscription.utilisateurEmail?.trim() || 'Email non disponible';
  }

  private getInscriptionStatusLabel(status?: string): string {
    switch (status) {
      case 'VALIDEE':
        return 'Validee';
      case 'REFUSEE':
        return 'Refusee';
      case 'ANNULEE':
        return 'Annulee';
      default:
        return 'En attente';
    }
  }

  private getInscriptionStatusClass(status?: string): string {
    switch (status) {
      case 'VALIDEE':
        return 'status-chip status-chip--success';
      case 'REFUSEE':
        return 'status-chip status-chip--danger';
      case 'ANNULEE':
        return 'status-chip status-chip--neutral';
      default:
        return 'status-chip status-chip--warning';
    }
  }
}
