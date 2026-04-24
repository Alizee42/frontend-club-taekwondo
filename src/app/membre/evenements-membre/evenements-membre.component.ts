import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EvenementService, EvenementDTO } from '../../services/evenement.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-evenements-membre',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './evenements-membre.component.html',
  styleUrls: ['./evenements-membre.component.css']
})
export class EvenementsMembre implements OnInit {
  evenements: EvenementDTO[] = [];
  isLoading = false;
  errorMsg = '';
  isInscribing = false;

  constructor(
    private evenementService: EvenementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  chargerEvenements(): void {
    this.isLoading = true;
    this.errorMsg = '';
    
    // Charger les événements et les inscriptions en parallèle
    Promise.all([
      this.evenementService.getEvenementsActifs().toPromise(),
      this.evenementService.getMesInscriptions().toPromise()
    ]).then(([evenements, inscriptions]) => {
      // Marquer les événements où l'utilisateur est inscrit
      const inscriptionsIds = (inscriptions || []).map(i => i.evenementId);
      
      this.evenements = (evenements || []).map(e => ({
        ...e,
        isInscrit: inscriptionsIds.includes(e.id)
      }));
      
      this.isLoading = false;
    }).catch((error) => {
      console.error('Erreur lors du chargement des données:', error);
      this.errorMsg = 'Impossible de charger les événements. Veuillez réessayer.';
      this.isLoading = false;
    });
  }

  sInscrire(evenement: EvenementDTO): void {
    if (this.isInscribing) return;
    
    this.isInscribing = true;
    
    this.evenementService.inscrireMembreEvenement(evenement.id).subscribe({
      next: () => {
        evenement.isInscrit = true;
        evenement.nbInscrits = (evenement.nbInscrits || 0) + 1;
        this.isInscribing = false;
        console.log('✅ Inscription réussie !');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de l\'inscription:', error);
        this.isInscribing = false;
      }
    });
  }

  seDesinscrire(evenement: EvenementDTO): void {
    if (this.isInscribing) return;
    
    this.isInscribing = true;
    
    this.evenementService.desinscrireEvenement(evenement.id).subscribe({
      next: () => {
        evenement.isInscrit = false;
        evenement.nbInscrits = Math.max((evenement.nbInscrits || 1) - 1, 0);
        this.isInscribing = false;
        console.log('✅ Désinscription réussie !');
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la désinscription:', error);
        this.isInscribing = false;
      }
    });
  }

  isEvenementComplet(evenement: EvenementDTO): boolean {
    if (!evenement.capacite || evenement.capacite <= 0) return false;
    return (evenement.nbInscrits || 0) >= evenement.capacite;
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
      return `${debut.toLocaleDateString('fr-FR', optionsDate)} de ${debut.toLocaleTimeString('fr-FR', optionsHeure)} à ${fin.toLocaleTimeString('fr-FR', optionsHeure)}`;
    } else {
      return `Du ${debut.toLocaleDateString('fr-FR', optionsDate)} au ${fin.toLocaleDateString('fr-FR', optionsDate)}`;
    }
  }

  trackByEvenement(index: number, evenement: EvenementDTO): number {
    return evenement.id;
  }

  onImageError(event: any): void {
    event.target.src = '/assets/images/default-event.jpg';
  }
}
