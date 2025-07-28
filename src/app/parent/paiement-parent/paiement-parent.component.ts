import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembreService } from '../../services/membre.service';

interface Membre {
  id: number;
  nom: string;
  prenom: string;
}

@Component({
  selector: 'app-paiement-parent',
  standalone: true,
  templateUrl: './paiement-parent.component.html',
  styleUrls: ['./paiement-parent.component.css'],
  imports: [CommonModule]
})
export class PaiementParentComponent implements OnInit {
  membres: Membre[] = [];
  membreSelectionne: Membre | null = null;
  step = 1;

  constructor(private membreService: MembreService) {}

  ngOnInit(): void {
    this.loadMembresEnfants();
  }

  loadMembresEnfants(): void {
    this.membreService.getMembresPourParentConnecte().subscribe({
      next: (data) => {
        this.membres = data;
        console.log('[✅] Membres enfants chargés :', this.membres);
      },
      error: (err) => {
        console.error('[❌] Erreur lors du chargement des membres enfants :', err);
      }
    });
  }

  selectMembre(membre: Membre): void {
    this.membreSelectionne = membre;
    this.step = 2;
  }

  nextStep(): void {
    this.step++;
  }

  prevStep(): void {
    this.step--;
  }

  payerCotisation(): void {
    console.log('💳 Paiement lancé pour :', this.membreSelectionne);
    this.step = 4;
  }
}
