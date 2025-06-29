import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EcheancesService, Echeance } from '../../../services/echeances.service';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface MembreAvecEcheances {
  nom: string;
  prenom: string;
  echeances: Echeance[];
  expanded?: boolean;
}

@Component({
  selector: 'app-echeances',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './echeances.component.html',
  styleUrls: ['./echeances.component.css']
})
export class EcheancesComponent implements OnInit {
  membresAvecEcheances: MembreAvecEcheances[] = [];
  membresSource: MembreAvecEcheances[] = [];
  filtreTexte: string = '';

  constructor(private echeanceService: EcheancesService) {}

  ngOnInit(): void {
    this.echeanceService.getAllEcheances().subscribe(data => {
      const groupes = this.groupEcheancesParMembre(data);
      this.membresAvecEcheances = groupes;
      this.membresSource = groupes;
    });
  }

  groupEcheancesParMembre(echeances: Echeance[]): MembreAvecEcheances[] {
    const map = new Map<string, MembreAvecEcheances>();

    echeances.forEach(e => {
      const key = `${e.prenom} ${e.nom}`;
      if (!map.has(key)) {
        map.set(key, {
          nom: e.nom,
          prenom: e.prenom,
          echeances: [],
          expanded: false
        });
      }
      map.get(key)!.echeances.push(e);
    });

    return Array.from(map.values());
  }

  get membresFiltres(): MembreAvecEcheances[] {
    const filtre = this.filtreTexte.toLowerCase().trim();
    if (!filtre) {
      return this.membresSource;
    }

    return this.membresSource
      .filter(m =>
        (`${m.prenom} ${m.nom}`).toLowerCase().includes(filtre)
      )
      .map(m => ({ ...m, expanded: false }));
  }

  marquerCommePayee(echeance: Echeance): void {
    echeance.statut = 'payé';
  }

  supprimerEcheance(echeance: Echeance): void {
    this.membresAvecEcheances.forEach(m => {
      m.echeances = m.echeances.filter(e => e.id !== echeance.id);
    });
    this.membresSource.forEach(m => {
      m.echeances = m.echeances.filter(e => e.id !== echeance.id);
    });
  }

  relancerEcheance(echeance: Echeance): void {
    alert(`Un email de relance a été envoyé à ${echeance.prenom} ${echeance.nom}.`);
  }
}
