import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface Avis {
  id: number;
  contenu: string;
  auteur: string;
  approuve: boolean;
  note?: number;
  pseudoVisiteur?: string;
  typeAvis?: string;
  datePub?: Date;
  photo?: string;
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
  nouvelAvis: Partial<Avis> = { contenu: '', auteur: '', note: 5 };

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
      this.chargerAvis();
    });
  }

  supprimerAvis(id: number): void {
    this.http.delete(`http://localhost:8080/api/avis/${id}`).subscribe(() => {
      this.chargerAvis();
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

  getInitials(nom: string): string {
    if (!nom) return '';
    const parts = nom.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
  }

  getPhotoUrl(photo: string): string {
    return `http://localhost:8080/uploads/avis/${photo}`;
  }
  
}
