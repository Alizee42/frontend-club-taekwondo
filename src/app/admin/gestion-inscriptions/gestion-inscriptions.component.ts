import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';

type Statut = 'NOUVEAU'|'VALIDE'|'REFUSE'|string;

interface Membre {
  id: string|number;
  nom: string;
  prenom: string;
  dateNaissance: string; // ISO
  ceinture?: string;
  numeroLicence?: string;
}

interface Utilisateur {
  id: string|number;
  role: 'PARENT'|'MEMBRE';
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresseLigne1: string;
  adresseLigne2?: string;
  codePostal: string;
  ville: string;
  pays: string;
  membres: Membre[];
  etat: Statut;
  _expand?: boolean;
  _membersLoaded?: boolean;
  _membersLoading?: boolean;
}

@Component({
  selector: 'app-gestion-inscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, HttpClientModule],
  templateUrl: './gestion-inscriptions.component.html',
  styleUrls: ['./gestion-inscriptions.component.css']
})
export class GestionInscriptionsComponent implements OnInit {
  private readonly API_BASE = '/api';

  loading = false;
  erreurMessage = '';

  query = '';
  sortKey: keyof (Utilisateur & { nbMembres:number }) = 'nom';
  sortDir: 'asc'|'desc' = 'asc';
  page = 1; pageSize = 10; totalPages = 1;

  utilisateurs: Utilisateur[] = [];
  filtered: Utilisateur[] = [];
  paged: Utilisateur[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchUtilisateurs();
  }

  // ===== API =====
  fetchUtilisateurs(): void {
    this.loading = true;
    this.erreurMessage = '';

    let params: HttpParams = new HttpParams();
    if (this.query.trim()) params = params.set('q', this.query.trim());

    this.http.get<any>(`${this.API_BASE}/utilisateurs`, { params }).subscribe({
      next: (res: any) => {
        const items: any[] = Array.isArray(res) ? res
          : Array.isArray(res?.items) ? res.items
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.results) ? res.results
          : Array.isArray(res?.utilisateurs) ? res.utilisateurs
          : [];
        this.utilisateurs = items.map((u: any) => this.normalizeUser(u));
        this.applyFilters();
      },
      error: () => this.erreurMessage = 'Impossible de charger les inscriptions.',
      complete: () => this.loading = false
    });
  }

  private normalizeUser(u: any): Utilisateur {
    // Adresse combinée éventuelle
    const addr = u.adresse as string | undefined;
    let adresseLigne1 = u.adresseLigne1 || '';
    let codePostal = u.codePostal || '';
    let ville = u.ville || '';
    let pays = u.pays || '';

    if (addr && !adresseLigne1) {
      const parts = addr.split(',');
      adresseLigne1 = parts[0]?.trim() || '';
      const rest = parts.slice(1).join(',').trim();
      const m = rest.match(/(\d{4,5})\s+([^,]+)(?:,\s*(.*))?/);
      if (m) { codePostal ||= m[1]; ville ||= m[2]; if (!pays && m[3]) pays = m[3]; }
    }

    // Si le backend renvoie déjà les enfants (membres|enfants)
    const initialKidsRaw: any[] =
      Array.isArray(u.membres) ? u.membres :
      Array.isArray(u.enfants) ? u.enfants : [];

    const initialKids: Membre[] = initialKidsRaw.map((m: any) => ({
      id: m.id ?? m._id ?? m.uuid,
      nom: m.nom || '',
      prenom: m.prenom || '',
      dateNaissance: m.dateNaissance || '',
      ceinture: m.ceinture,
      numeroLicence: m.numeroLicence
    }));

    const declaredRole = String(u.role || '').toUpperCase();
    const inferredParent = initialKids.length > 0;
    const role: 'PARENT'|'MEMBRE' =
      declaredRole === 'PARENT' ? 'PARENT' :
      declaredRole === 'MEMBRE' ? 'MEMBRE' :
      (inferredParent ? 'PARENT' : 'MEMBRE');

    return {
      id: u.id ?? u._id ?? u.uuid,
      role,
      nom: u.nom || '',
      prenom: u.prenom || '',
      email: u.email || '',
      telephone: u.telephone || '',
      adresseLigne1,
      adresseLigne2: u.adresseLigne2 || '',
      codePostal, ville, pays,
      membres: initialKids,                             // 👈 pré-rempli si dispo
      etat: u.etat || 'NOUVEAU',
      _expand: false,
      _membersLoaded: role !== 'PARENT' ? true : initialKids.length > 0, // parent déjà chargé si enfants fournis
      _membersLoading: false
    };
  }

  // ——— Membres: charge via /membres/by-parent/{id} + fallbacks ———
  private extractMembersArray(res: any): any[] {
    return Array.isArray(res) ? res
      : Array.isArray(res?.items) ? res.items
      : Array.isArray(res?.data) ? res.data
      : Array.isArray(res?.results) ? res.results
      : Array.isArray(res?.membres) ? res.membres
      : [];
  }

  private loadMembers(u: Utilisateur, expandAfter = false): void {
    if (u._membersLoaded || u._membersLoading || u.role !== 'PARENT') {
      if (expandAfter) u._expand = !u._expand;
      return;
    }
    u._membersLoading = true;

    const tryUrls: string[] = [
      `${this.API_BASE}/membres/by-parent/${u.id}`,           // ✅ route principale (liste enfants)
      `${this.API_BASE}/utilisateurs/${u.id}/membres`,        // fallback possible
      `${this.API_BASE}/membres?parentId=${u.id}`,            // fallback query variant
      `${this.API_BASE}/membres?utilisateurId=${u.id}`        // autre variant
    ];

    const tryNext = (i: number) => {
      if (i >= tryUrls.length) {
        u.membres = [];
        u._membersLoaded = true;
        u._membersLoading = false;
        if (expandAfter) u._expand = true;
        return;
      }
      const url = tryUrls[i];
      // console.debug('👶 GET enfants ->', url);
      this.http.get<any>(url).subscribe({
        next: (res: any) => {
          const arr = this.extractMembersArray(res);
          u.membres = (arr || []).map((m: any) => ({
            id: m.id ?? m._id ?? m.uuid,
            nom: m.nom || '',
            prenom: m.prenom || '',
            dateNaissance: m.dateNaissance || '',
            ceinture: m.ceinture,
            numeroLicence: m.numeroLicence
          }));
          u._membersLoaded = true;
          u._membersLoading = false;
          if (expandAfter) u._expand = true;
        },
        error: () => tryNext(i + 1)
      });
    };

    tryNext(0);
  }

  toggleExpand(u: Utilisateur): void {
    if (!u._membersLoaded) {
      this.loadMembers(u, true); // charge puis ouvre
    } else {
      u._expand = !u._expand;
    }
  }

  // ===== Filtres / tri / pagination =====
  applyFilters(): void {
    const q = this.query.trim().toLowerCase();

    this.filtered = this.utilisateurs.filter((u: Utilisateur) => {
      const txt = [u.nom,u.prenom,u.email,u.telephone,u.ville,u.pays,u.adresseLigne1,u.adresseLigne2,u.codePostal]
        .filter(Boolean).join(' ').toLowerCase();
      return q === '' || txt.includes(q);
    });

    const getKey = (u: Utilisateur) => {
      switch (this.sortKey) {
        case 'etat': return u.etat;
        case 'email': return u.email.toLowerCase();
        case 'telephone': return u.telephone;
        case 'nom': return `${u.nom} ${u.prenom}`.toLowerCase();
        case 'nbMembres': return u.membres.length;
        default: return (u as any)[this.sortKey];
      }
    };
    this.filtered.sort((a: Utilisateur, b: Utilisateur) => {
      const va = getKey(a), vb = getKey(b);
      if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
    this.slicePage();
  }

  sortBy(key: any): void {
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
    // précharge les membres (compteurs) uniquement pour les parents non chargés
    this.paged.forEach((u: Utilisateur) => {
      if (u.role === 'PARENT' && !u._membersLoaded && !u._membersLoading) {
        this.loadMembers(u, false);
      }
    });
  }

  clearSearch(): void { this.query = ''; this.fetchUtilisateurs(); }

  // ===== Actions =====
  view(u: Utilisateur): void { alert(`Détails de ${u.prenom} ${u.nom}`); }
  contact(u: Utilisateur): void { window.location.href = `mailto:${u.email}`; }
  approve(u: Utilisateur): void { u.etat = 'VALIDE'; }
  reject(u: Utilisateur): void { u.etat = 'REFUSE'; }
  remove(u: Utilisateur): void {
    if (confirm('Supprimer cette inscription ?')) {
      this.utilisateurs = this.utilisateurs.filter((x: Utilisateur) => x.id !== u.id);
      this.applyFilters();
    }
  }

  trackById(_: number, item: Utilisateur){ return item.id; }
}
