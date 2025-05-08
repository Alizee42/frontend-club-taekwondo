import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface Avis {
  id: number;
  contenu: string;
  auteur: string;
  approuve: boolean;
  note?: number; // Note ajoutée
  pseudoVisiteur?: string; // Ajout de pseudoVisiteur
  typeAvis?: string; // Ajout de typeAvis
  datePub?: Date; // Ajout de datePub
}

@Component({
  selector: 'app-gestion-avis',
  templateUrl: './gestion-avis.component.html',
  styleUrls: ['./gestion-avis.component.css'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
})
export class GestionAvisComponent implements OnInit {
  avisEnAttente: Avis[] = [];
  avisApprouves: Avis[] = [];
  nouvelAvis: Partial<Avis> = { contenu: '', auteur: '', note: 5 }; // Note par défaut

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerAvis();
  }

  chargerAvis(): void {
    this.http.get<Avis[]>('http://localhost:8080/api/avis').subscribe((data) => {
      this.avisEnAttente = data.filter((avis) => !avis.approuve);
      this.avisApprouves = data.filter((avis) => avis.approuve);
    });
  }

  approuverAvis(id: number): void {
    this.http.put(`http://localhost:8080/api/avis/${id}/approuver`, {}).subscribe(() => {
      console.log(`Avis ${id} approuvé.`);
      this.chargerAvis(); // Recharge les avis après approbation
    }, (error) => {
      console.error(`Erreur lors de l'approbation de l'avis ${id}:`, error);
    });
  }
  supprimerAvis(id: number): void {
    this.http.delete(`http://localhost:8080/api/avis/${id}`).subscribe(() => {
      this.chargerAvis(); // Recharge les avis après suppression
    });
  }

  ajouterAvis(): void {
    if (this.nouvelAvis.contenu && this.nouvelAvis.auteur) {
      this.http.post('/api/avis', this.nouvelAvis).subscribe(() => {
        this.nouvelAvis = { contenu: '', auteur: '', note: 5 };
        this.chargerAvis();
      });
    }
  }
}
