import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gestion-commandes',
  standalone: true, // ✅ important si standalone
  imports: [CommonModule, FormsModule], // ✅ directives et pipes Angular
  templateUrl: './gestion-commande.component.html',
  styleUrls: ['./gestion-commande.component.css']
})
export class GestionCommandesComponent implements OnInit {
  commandes: any[] = [];
  commandeSelectionnee: any = null;

  search = '';
  statutFilter = '';
  modeFilter = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  chargerCommandes(): void {
    let params = new HttpParams();
    if (this.search) params = params.set('q', this.search);
    if (this.statutFilter) params = params.set('statut', this.statutFilter);
    if (this.modeFilter) params = params.set('mode', this.modeFilter);

    this.http.get<any[]>('/api/commandes', { params }).subscribe({
      next: (data) => this.commandes = data,
      error: (err) => console.error('❌ Erreur chargement commandes:', err)
    });
  }

  marquerPaye(id: number): void {
    this.http.patch(`/api/commandes/${id}/marquer-paye`, {}, { responseType: 'text' })
      .subscribe(() => this.chargerCommandes());
  }

  marquerRetiree(id: number): void {
    this.http.patch(`/api/commandes/${id}/marquer-retiree`, {}, { responseType: 'text' })
      .subscribe(() => this.chargerCommandes());
  }

  voirDetails(cmd: any): void {
    this.http.get(`/api/commandes/${cmd.id}`).subscribe({
      next: (data) => this.commandeSelectionnee = data,
      error: (err) => console.error('❌ Erreur détails commande:', err)
    });
  }

  fermerDetails(): void {
    this.commandeSelectionnee = null;
  }
}
