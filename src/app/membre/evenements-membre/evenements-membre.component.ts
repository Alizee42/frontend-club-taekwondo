import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvenementService, EvenementDTO, InscriptionEvenementDTO } from '../../services/evenement.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

@Component({
  selector: 'app-evenements-membre',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, UiButtonComponent, EmptyStateComponent, KpiCardComponent, KpiGridComponent],
  templateUrl: './evenements-membre.component.html',
  styleUrls: ['./evenements-membre.component.css']
})
export class EvenementsMembre implements OnInit {
  evenements: EvenementDTO[] = [];
  isLoading = false;
  errorMsg = '';

  get nbEvenements()    { return this.evenements.length; }
  get mesInscriptions() { return this.evenements.filter(e => (e as any).isInscrit).length; }
  get prochainLabel()   {
    const now = Date.now();
    const prochain = this.evenements
      .filter(e => new Date(e.dateDebut).getTime() > now)
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())[0];
    if (!prochain) return 'Aucun';
    return new Date(prochain.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  isInscribing = false;
  currentPage = 1;
  readonly pageSize = 4;
  readonly fallbackEventImage = 'assets/images/default-event.jpg.jpg';

  constructor(private evenementService: EvenementService) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  chargerEvenements(): void {
    this.isLoading = true;
    this.errorMsg = '';

    Promise.all([
      this.evenementService.getEvenementsActifs().toPromise(),
      this.evenementService.getMesInscriptions().toPromise()
    ]).then(([evenements, inscriptions]) => {
      const inscriptionsParEvenement = new Map<number, InscriptionEvenementDTO>();

      (inscriptions || [])
        .filter(inscription => inscription.statut !== 'ANNULEE')
        .forEach(inscription => inscriptionsParEvenement.set(inscription.evenementId, inscription));

      this.evenements = (evenements || []).map(evenement => {
        const inscription = inscriptionsParEvenement.get(evenement.id);

        return {
          ...evenement,
          isInscrit: !!inscription,
          inscriptionId: inscription?.id ?? evenement.inscriptionId,
          inscriptionStatut: inscription?.statut ?? evenement.inscriptionStatut
        };
      });
      this.currentPage = 1;

      this.isLoading = false;
    }).catch((error) => {
      console.error('Erreur lors du chargement des donnees:', error);
      this.errorMsg = 'Impossible de charger les evenements. Veuillez reessayer.';
      this.isLoading = false;
    });
  }

  sInscrire(evenement: EvenementDTO): void {
    if (this.isInscribing) return;

    this.isInscribing = true;

    this.evenementService.inscrireMembreEvenement(evenement.id).subscribe({
      next: (inscription) => {
        evenement.isInscrit = true;
        evenement.inscriptionId = inscription?.id;
        evenement.inscriptionStatut = inscription?.statut || 'EN_ATTENTE';
        evenement.nbInscrits = (evenement.nbInscrits || 0) + 1;
        this.isInscribing = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de l inscription:', error);
        this.isInscribing = false;
      }
    });
  }

  seDesinscrire(evenement: EvenementDTO): void {
    if (this.isInscribing) return;

    if (!evenement.inscriptionId) {
      this.errorMsg = 'Impossible de retrouver cette inscription. Actualisez la page puis reessayez.';
      return;
    }

    this.isInscribing = true;

    this.evenementService.desinscrireEvenement(evenement.inscriptionId).subscribe({
      next: () => {
        evenement.isInscrit = false;
        evenement.inscriptionId = undefined;
        evenement.inscriptionStatut = undefined;
        evenement.nbInscrits = Math.max((evenement.nbInscrits || 1) - 1, 0);
        this.isInscribing = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de la desinscription:', error);
        this.isInscribing = false;
      }
    });
  }

  isEvenementComplet(evenement: EvenementDTO): boolean {
    if (!evenement.capacite || evenement.capacite <= 0) return false;
    return (evenement.nbInscrits || 0) >= evenement.capacite;
  }

  getInscriptionLabel(evenement: EvenementDTO): string {
    switch (evenement.inscriptionStatut) {
      case 'VALIDEE':
        return 'Validee';
      case 'REFUSEE':
        return 'Refusee';
      case 'EN_ATTENTE':
      default:
        return 'En attente';
    }
  }

  getInscriptionBadgeClass(evenement: EvenementDTO): string {
    switch (evenement.inscriptionStatut) {
      case 'VALIDEE':
        return 'status--success';
      case 'REFUSEE':
        return 'status--danger';
      case 'EN_ATTENTE':
      default:
        return 'status--warning';
    }
  }

  getDesinscriptionLabel(evenement: EvenementDTO): string {
    return evenement.inscriptionStatut === 'EN_ATTENTE' ? 'Annuler la demande' : 'Se desinscrire';
  }

  get totalPages(): number {
    return Math.max(Math.ceil(this.evenements.length / this.pageSize), 1);
  }

  get evenementsPage(): EvenementDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.evenements.slice(start, start + this.pageSize);
  }

  get paginationStart(): number {
    if (this.evenements.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.evenements.length);
  }

  changerPage(direction: number): void {
    const prochainePage = this.currentPage + direction;
    this.currentPage = Math.min(Math.max(prochainePage, 1), this.totalPages);
  }

  formatDateRange(dateDebut: string, dateFin: string): string {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    const optionsDate: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    const optionsHeure: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };

    if (debut.toDateString() === fin.toDateString()) {
      return `${debut.toLocaleDateString('fr-FR', optionsDate)} de ${debut.toLocaleTimeString('fr-FR', optionsHeure)} a ${fin.toLocaleTimeString('fr-FR', optionsHeure)}`;
    }

    return `Du ${debut.toLocaleDateString('fr-FR', optionsDate)} au ${fin.toLocaleDateString('fr-FR', optionsDate)}`;
  }

  trackByEvenement(index: number, evenement: EvenementDTO): number {
    return evenement.id;
  }

  onImageError(event: any): void {
    const img = event.target as HTMLImageElement;

    if (img.src.includes(this.fallbackEventImage)) {
      img.style.display = 'none';
      return;
    }

    img.src = this.fallbackEventImage;
  }
}
