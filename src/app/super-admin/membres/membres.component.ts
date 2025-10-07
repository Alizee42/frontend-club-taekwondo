import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembreService, Membre } from '../../services/membre.service';
import { AuthService, Utilisateur } from '../../services/auth.service';

@Component({
  selector: 'app-super-admin-membres',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Gestion des membres</h2>
    <div *ngIf="loading">Chargement...</div>
    <div *ngIf="error" class="error">{{ error }}</div>
    <table *ngIf="membres && membres.length">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Prénom</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let membre of membres">
          <td>{{ membre.nom }}</td>
          <td>{{ membre.prenom }}</td>
          <td>{{ membre.id }}</td>
        </tr>
      </tbody>
    </table>
    <div *ngIf="membres && !membres.length">Aucun membre pour ce club.</div>
  `
})
export class MembresComponent implements OnInit {
  membres: Membre[] = [];
  loading = false;
  error: string | null = null;

  constructor(private membreService: MembreService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loading = true;
    const utilisateur: Utilisateur | null = this.authService.getUtilisateurConnecte();
  const clubId = utilisateur?.['clubId'];
    if (!clubId) {
      this.error = "Aucun club sélectionné pour l'admin connecté.";
      this.loading = false;
      return;
    }
    this.membreService.getMembresParClub(clubId).subscribe({
      next: (membres) => {
        this.membres = membres || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = "Erreur lors du chargement des membres.";
        this.loading = false;
      }
    });
  }
}