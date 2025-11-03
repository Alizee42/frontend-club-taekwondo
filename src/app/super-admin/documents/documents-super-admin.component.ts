import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ClubService, Club } from '../../services/club.service';
import { labelFor as docLabelFor, normalizeStatus, unifyType } from '../../shared/documents/doc-utils';
import { UiTitleComponent } from '../../ui/ui-title';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

type Statut = 'validé' | 'refusé' | 'en_attente' | string;

interface DocumentDTO {
  id: number | string;
  typeDocument: string;
  nomDocument: string;
  status: string;
  dateDepot?: string;
  cheminFichier?: string;
  commentaire?: string;
  utilisateurId?: number | string;
  membreId?: number | string;
  utilisateur?: { id: number | string; nom: string; prenom: string; email: string; role?: string; clubId?: number };
  enfant?: { id: number | string; prenom?: string; nom?: string } | null;
}

interface Row {
  id: number | string;
  clubId?: number | null;
  clubNom: string;
  utilisateurNom: string;
  utilisateurEmail: string;
  enfantNom: string;
  typeLabel: string;
  nomDocument: string;
  statut: Statut;
  dateDepot?: string;
}

@Component({
  selector: 'app-documents-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTitleComponent, UiTableComponent, UiButtonComponent],
  templateUrl: './documents-super-admin.component.html',
  styleUrls: ['./documents-super-admin.component.css']
})
export class DocumentsSuperAdminComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  clubs: Club[] = [];
  selectedClubId: number | null = null;

  rows: Row[] = [];
  filtered: Row[] = [];

  search = '';
  statut: '' | 'en_attente' | 'validé' | 'refusé' = '';

  // ui-table configuration
  columns: UiTableColumn[] = [
    { key: 'clubNom', label: 'Club' },
    { key: 'utilisateurNom', label: 'Utilisateur' },
    { key: 'utilisateurEmail', label: 'Email' },
    { key: 'enfantNom', label: 'Enfant' },
    { key: 'typeLabel', label: 'Type' },
    { key: 'nomDocument', label: 'Nom du fichier' },
    { key: 'statut', label: 'Statut' },
    { key: 'dateDepot', label: 'Date' }
  ];
  actions = [
    { label: '', icon: 'ri-download-line', action: 'download', color: '#2563eb' }
  ];

  constructor(private http: HttpClient, private clubService: ClubService) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  private headers(): HttpHeaders {
    const t = localStorage.getItem('token');
    let h = new HttpHeaders();
    if (t && t !== 'null' && t !== 'undefined') h = h.set('Authorization', `Bearer ${t}`);
    return h;
  }

  private loadClubs() {
    this.clubService.getClubs().subscribe({
      next: (clubs) => { this.clubs = clubs || []; this.loadDocs(); },
      error: () => { this.clubs = []; this.loadDocs(); }
    });
  }

  onSelectClub() { this.loadDocs(); }

  loadDocs() {
    const qp = this.selectedClubId ? `?clubId=${this.selectedClubId}` : '';
    this.http.get<DocumentDTO[]>(`${this.API_BASE}/documents/all${qp}`, { headers: this.headers() }).subscribe({
      next: (docs) => {
        const mapClubName = (id?: number | null) => {
          if (!id) return '—';
          const c = this.clubs.find(x => Number(x.id) === Number(id));
          return c ? (c.nom || (c as any).name || `Club ${id}`) : `Club ${id}`;
        };
        const toRow = (d: DocumentDTO): Row => {
          const clubId = d.utilisateur?.clubId ?? null;
          const utilisateurNom = `${(d.utilisateur?.prenom || '').trim()} ${(d.utilisateur?.nom || '').trim()}`.trim();
          const enfantNom = d.enfant ? `${d.enfant.prenom || ''} ${d.enfant.nom || ''}`.trim() : '';
          return {
            id: d.id,
            clubId,
            clubNom: mapClubName(clubId),
            utilisateurNom: utilisateurNom || '—',
            utilisateurEmail: d.utilisateur?.email || '—',
            enfantNom: enfantNom || '—',
            typeLabel: docLabelFor(unifyType(d.typeDocument)),
            nomDocument: d.nomDocument || '—',
            statut: normalizeStatus(d.status),
            dateDepot: d.dateDepot
          };
        };
        this.rows = (docs || []).map(toRow);
        this.applyFilters();
      },
      error: (err) => { console.error('Erreur load docs', err); this.rows = []; this.filtered = []; }
    });
  }

  applyFilters() {
    const term = this.search.trim().toLowerCase();
    const stat = this.statut;
    this.filtered = this.rows.filter(r => {
      const matchClub = !this.selectedClubId || Number(r.clubId || 0) === Number(this.selectedClubId);
      const txt = `${r.clubNom} ${r.utilisateurNom} ${r.utilisateurEmail} ${r.enfantNom} ${r.typeLabel} ${r.nomDocument}`.toLowerCase();
      const matchText = !term || txt.includes(term);
      const matchStatut = !stat || normalizeStatus(r.statut) === stat;
      return matchClub && matchText && matchStatut;
    });
  }

  onSearchChange() { this.applyFilters(); }
  onStatutChange() { this.applyFilters(); }

  downloadUrl(id: number | string): string {
    return `${this.API_BASE}/documents/${id}/download`;
  }

  handleAction(event: { action: string; row: Row }) {
    if (event.action === 'download') {
      const url = this.downloadUrl(event.row.id);
      window.open(url, '_blank');
    }
  }
}

