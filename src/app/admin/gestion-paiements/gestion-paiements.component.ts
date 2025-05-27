import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gestion-paiements',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestion-paiements.component.html',
  styleUrls: ['./gestion-paiements.component.css']
})
export class GestionPaiementsComponent implements OnInit {
  paiements: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPaiements();
  }

  // Charger tous les paiements
  loadPaiements(): void {
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:8080/api/paiements', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.paiements = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des paiements :', err);
      }
    });
  }

  // Valider un paiement
  validerPaiement(id: number): void {
    const token = localStorage.getItem('token');
    this.http.put(`http://localhost:8080/api/paiements/${id}/valider`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        alert('Paiement validé avec succès.');
        this.loadPaiements();
      },
      error: (err) => {
        console.error('Erreur lors de la validation du paiement :', err);
      }
    });
  }
}