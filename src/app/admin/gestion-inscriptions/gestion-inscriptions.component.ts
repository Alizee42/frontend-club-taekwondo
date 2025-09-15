import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';

type Statut = 'NOUVEAU'|'VALIDE'|'REFUSE'|string;

interface Membre {
  id: string|number;
  nom: string;
  prenom: string;
  dateNaissance: string; // ISO (yyyy-MM-dd ok)
  ceinture?: string;
  numeroLicence?: string;
}

interface Utilisateur {
  id: string|number;
  role: 'PARENT'|'MEMBRE'|string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresseLigne1: string;
  adresseLigne2?: string;
  codePostal: string;
  ville: string;
  pays: string;
  dateNaissance?: string;
  membres: Membre[];
  etat?: Statut; // consultatif
  _expand?: boolean;
  _membersLoaded?: boolean;
  _membersLoading?: boolean;
}

/** Tri utilisable (pas de 'etat' en consultatif) */
type SortKey = 'nom' | 'email' | 'telephone' | 'nbMembres';

@Component({
  selector: 'app-gestion-inscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './gestion-inscriptions.component.html',
  styleUrls: ['./gestion-inscriptions.component.css']
})
export class GestionInscriptionsComponent implements OnInit {
  private readonly API_BASE = '/api';

  loading = false;
  erreurMessage = '';

  query = '';
  sortKey: SortKey = 'nom';
  sortDir: 'asc'|'desc' = 'asc';
  page = 1; pageSize = 10; totalPages = 1;

  utilisateurs: Utilisateur[] = [];
  filtered: Utilisateur[] = [];
  paged: Utilisateur[] = [];

  selectedUser: Utilisateur | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchUtilisateurs();
  }

  // ===== Helpers =====
  private emptyToUndef = (v: any) => (v === '' || v === null || v === undefined) ? undefined : v;

  /** Parse une adresse "ligne cp ville" en morceaux si dispo */
  private splitOneLineAddress(addr?: string) {
    const out = { l1: '', l2: '', cp: '', ville: '', pays: '' };
    if (!addr) return out;
    const s = addr.trim().replace(/\s+/g, ' ');
    // Cherche CP + ville à la fin
    const m = s.match(/^(.*?)(?:,\s*)?(\d{4,5})\s+([^,]+)(?:,\s*(.*))?$/i);
    if (m) {
      out.l1 = (m[1] || '').trim();
      out.cp = (m[2] || '').trim();
      out.ville = (m[3] || '').trim();
      out.pays = (m[4] || '').trim();
    } else {
      out.l1 = s;
    }
    return out;
  }

  private mapKid = (m: any): Membre => ({
    id: m.id ?? m._id ?? m.uuid,
    nom: m.nom ?? '',
    prenom: m.prenom ?? '',
    dateNaissance: m.dateNaissance ?? '',
    ceinture: this.emptyToUndef(m.ceinture),
    numeroLicence: this.emptyToUndef(m.numeroLicence),
  });

  private normalizeUser(u: any): Utilisateur {
    // L'API fournit "adresse" en une ligne : on tente de découper
    const parsed = this.splitOneLineAddress(u.adresse || undefined);

    return {
      id: u.id ?? u._id ?? u.uuid,
      role: String(u.role || '').toUpperCase(),
      nom: (u.nom ?? '').trim(),
      prenom: (u.prenom ?? '').trim(),
      email: (u.email ?? '').trim(),
      telephone: (u.telephone ?? '').trim(),
      adresseLigne1: parsed.l1,
      adresseLigne2: '',
      codePostal: parsed.cp,
      ville: parsed.ville,
      pays: parsed.pays,
      dateNaissance: u.dateNaissance ?? undefined,
      membres: [], // remplis après jointure
      etat: u.etat, // consultatif
      _expand: false,
      _membersLoaded: false,
      _membersLoading: false
    };
  }

  // ===== API =====
  fetchUtilisateurs(): void {
    this.loading = true;
    this.erreurMessage = '';

    // On charge utilisateurs + membres en parallèle
    const params = this.query.trim() ? new HttpParams().set('q', this.query.trim()) : new HttpParams();

    const reqUsers = this.http.get<any>(`${this.API_BASE}/utilisateurs`, { params });
    const reqKids  = this.http.get<any>(`${this.API_BASE}/membres`);

    forkJoin([reqUsers, reqKids]).subscribe({
      next: ([usersRes, kidsRes]) => {
        const usersArr: any[] = Array.isArray(usersRes) ? usersRes
          : Array.isArray(usersRes?.items) ? usersRes.items
          : Array.isArray(usersRes?.data) ? usersRes.data
          : Array.isArray(usersRes?.results) ? usersRes.results
          : Array.isArray(usersRes?.utilisateurs) ? usersRes.utilisateurs
          : [];

        const kidsArr: any[] = Array.isArray(kidsRes) ? kidsRes
          : Array.isArray(kidsRes?.items) ? kidsRes.items
          : Array.isArray(kidsRes?.data) ? kidsRes.data
          : Array.isArray(kidsRes?.results) ? kidsRes.results
          : Array.isArray(kidsRes?.membres) ? kidsRes.membres
          : [];

        // 1) Normalise tous les utilisateurs
        let users = usersArr
          .map(u => this.normalizeUser(u))
          // on ne liste pas les ADMIN ici
          .filter(u => u.role === 'PARENT' || u.role === 'MEMBRE');

        // 2) Groupe les enfants par utilisateurId
        const kidsByParent: Record<string, Membre[]> = {};
        for (const k of kidsArr) {
          const parentId = k.utilisateurId;
          if (parentId == null) continue;
          const list = (kidsByParent[parentId] ||= []);
          list.push(this.mapKid(k));
        }

        // 3) Attache les enfants aux PARENTs
        users = users.map(u => {
          if (u.role === 'PARENT') {
            const kids = kidsByParent[String(u.id)] || [];
            u.membres = this.sortMembers(kids);
            u._membersLoaded = true;
          } else {
            u.membres = []; // adulte seul
            u._membersLoaded = true;
          }
          return u;
        });

        this.utilisateurs = users;
        this.applyFilters();
      },
      error: () => this.erreurMessage = 'Impossible de charger les inscriptions.',
      complete: () => this.loading = false
    });
  }

  /** Tri lisible des enfants : prénom puis nom */
  private sortMembers(list: Membre[]): Membre[] {
    return [...(list || [])].sort((a, b) => {
      const pa = (a.prenom || '').toLowerCase();
      const pb = (b.prenom || '').toLowerCase();
      if (pa < pb) return -1; if (pa > pb) return 1;
      const na = (a.nom || '').toLowerCase();
      const nb = (b.nom || '').toLowerCase();
      if (na < nb) return -1; if (na > nb) return 1;
      return 0;
    });
  }

  // ===== Expand membres (plus d’appel réseau, tout est préchargé) =====
  loadMembers(u: Utilisateur, expandAfter = false): void {
    // plus nécessaire : tout est déjà en mémoire
    if (expandAfter) u._expand = !u._expand;
  }

  toggleExpand(u: Utilisateur): void {
    if (u.role !== 'PARENT') return;
    u._expand = !u._expand;
  }

  // ===== Filtres / tri / pagination =====
  applyFilters(): void {
    const q = this.query.trim().toLowerCase();

    this.filtered = this.utilisateurs.filter((u: Utilisateur) => {
      const txt = [
        u.nom, u.prenom, u.email, u.telephone, u.ville, u.pays, u.adresseLigne1, u.adresseLigne2, u.codePostal
      ].filter(Boolean).join(' ').toLowerCase();
      return q === '' || txt.includes(q);
    });

    const getKey = (u: Utilisateur): string | number => {
      switch (this.sortKey) {
        case 'email': return (u.email || '').toLowerCase();
        case 'telephone': return u.telephone || '';
        case 'nom': return `${u.nom} ${u.prenom}`.toLowerCase();
        case 'nbMembres': return u.membres.length;
      }
    };

    this.filtered.sort((a: Utilisateur, b: Utilisateur) => {
      const va = getKey(a) as any, vb = getKey(b) as any;
      if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
    this.slicePage();
  }

  sortBy(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  goToPage(p: number): void { this.page = Math.max(1, Math.min(this.totalPages, p)); this.slicePage(); }
  nextPage(): void { this.goToPage(this.page + 1); }
  prevPage(): void { this.goToPage(this.page - 1); }

  slicePage(): void {
    const start = (this.page - 1) * this.pageSize;
    this.paged = this.filtered.slice(start, start + this.pageSize);
  }

  clearSearch(): void { this.query = ''; this.fetchUtilisateurs(); }

  // ===== Helpers UI =====
  formatAddress(u: Partial<Utilisateur> | null | undefined): string {
    if (!u) return '';
    const simple = (u as any).adresse as string | undefined;

    const l1 = (u.adresseLigne1 ?? '').trim();
    const l2 = (u.adresseLigne2 ?? '').trim();
    const cp = (u.codePostal ?? '').trim();
    const ville = (u.ville ?? '').trim();
    const pays = (u.pays ?? '').trim();

    const parts: string[] = [];
    if (simple) parts.push(simple);
    if (l1) parts.push(l1);
    if (l2) parts.push(l2);
    const lastLine = [cp, ville, pays].filter(Boolean).join(' ');
    if (lastLine) parts.push(lastLine);

    return Array.from(new Set(parts.filter(Boolean))).join(', ');
  }

  trackById(_: number, item: Utilisateur){ return item.id; }

  // ===== Modale =====
  view(u: Utilisateur): void {
    this.selectedUser = u;
    document.body.classList.add('modal-open');
  }

  closeModal(): void {
    this.selectedUser = null;
    document.body.classList.remove('modal-open');
  }

  viewInNewTab(u: Utilisateur): void {
    window.open(`mailto:${u.email}`, '_blank');
  }

  remove(u: Utilisateur): void {
    if (!u || !u.id) return;
    const ok = confirm(`Supprimer l'utilisateur ${u.prenom} ${u.nom} ?`);
    if (!ok) return;

    this.http.delete(`${this.API_BASE}/utilisateurs/${u.id}`, { observe: 'response' })
      .subscribe({
        next: () => {
          this.utilisateurs = this.utilisateurs.filter(x => x.id !== u.id);
          this.applyFilters();
        },
        error: () => {
          this.utilisateurs = this.utilisateurs.filter(x => x.id !== u.id);
          this.applyFilters();
        }
      });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscKeydown(ev: KeyboardEvent): void {
    if (this.selectedUser) {
      ev.preventDefault();
      this.closeModal();
    }
  }
}
