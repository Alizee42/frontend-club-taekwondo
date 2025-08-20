import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/toast/toast.service';

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

  loadingIds = new Set<number>();
  errorMsg: string | null = null;

  // ✅ root-absolu (passe via le proxy /api)
  private readonly baseUrl = '/api/avis';

  constructor(private http: HttpClient, private toast: ToastService) {}

  ngOnInit(): void { this.chargerAvis(); }

  trackByAvisId = (_: number, a: { id?: number }) => a?.id ?? _;

  chargerAvis(): void {
    this.errorMsg = null;
    this.http.get<Avis[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.avisEnAttente = (data || []).filter(a => !a.approuve);
        this.avisApprouves = (data || []).filter(a => a.approuve);
      },
      error: () => {
        this.errorMsg = 'Impossible de charger les avis.';
        this.toast.error('Impossible de charger les avis. Réessayez dans un instant.');
      }
    });
  }

  approuverAvis(id: number): void {
    if (!id) return;
    if (!confirm('Confirmer l’approbation de cet avis ?')) return;

    this.loadingIds.add(id);
    this.http.put(`${this.baseUrl}/${id}/approuver`, {}).subscribe({
      next: () => { 
        this.toast.success('Votre avis a été approuvé.'); 
        this.chargerAvis(); 
      },
      error: () => this.toast.error('Impossible d’approuver cet avis. Veuillez réessayer.'),
      complete: () => this.loadingIds.delete(id)
    });
  }

  supprimerAvis(id: number): void {
    if (!id) return;
    if (!confirm('Supprimer cet avis ?')) return;

    this.loadingIds.add(id);
    this.http.delete(`${this.baseUrl}/${id}`).subscribe({
      next: () => { 
        this.toast.info('Votre avis a été supprimé.'); 
        this.chargerAvis(); 
      },
      error: () => this.toast.error('Impossible de supprimer cet avis. Veuillez réessayer.'),
      complete: () => this.loadingIds.delete(id)
    });
  }

  ajouterAvis(): void {
    if (!this.nouvelAvis.contenu?.trim() || !this.nouvelAvis.auteur?.trim()) {
      this.toast.warning('Veuillez renseigner le contenu et l’auteur.');
      return;
    }
    if (this.nouvelAvis.note != null) this.nouvelAvis.note = +this.nouvelAvis.note;

    this.http.post(this.baseUrl, this.nouvelAvis).subscribe({
      next: () => { 
        this.toast.success('Votre avis a été ajouté.'); 
        this.nouvelAvis = { contenu: '', auteur: '', note: 5 }; 
        this.chargerAvis(); 
      },
      error: () => this.toast.error('Impossible d’ajouter l’avis. Veuillez réessayer.')
    });
  }

  getInitials(nom: string): string {
    if (!nom) return '';
    const p = nom.trim().split(/\s+/);
    if (p.length === 1) return p[0][0]?.toUpperCase() ?? '';
    return (p[0][0] + p[1][0]).toUpperCase();
  }

  getPhotoUrl(photo: string | null | undefined): string {
    return photo ? `/api/uploads/avis/${encodeURIComponent(photo)}` : '';
  }  
}
