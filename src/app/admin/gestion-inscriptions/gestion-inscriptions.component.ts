import { Component, OnInit } from '@angular/core';

type Statut = 'NOUVEAU'|'VALIDE'|'REFUSE';

interface Membre {
  nom: string;
  prenom: string;
  dateNaissance: string; // ISO
  ceinture?: string;
  numeroLicence?: string;
}

interface Utilisateur {
  id: string;
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
  _expand?: boolean; // UI only
}

@Component({
  selector: 'app-gestion-inscriptions',
  templateUrl: './gestion-inscriptions.component.html',
  styleUrls: ['./gestion-inscriptions.component.css']
})
export class GestionInscriptionsComponent implements OnInit {
  // Données (mock de départ ; remplace par ton fetch API)
  utilisateurs: Utilisateur[] = [];

  // UI state
  query = '';
  statusFilter: ''|Statut = '';
  sortKey: keyof (Utilisateur & {nbMembres:number}) = 'nom';
  sortDir: 'asc'|'desc' = 'asc';

  // pagination
  page = 1;
  pageSize = 10;
  totalPages = 1;

  // dérivés
  filtered: Utilisateur[] = [];
  paged: Utilisateur[] = [];

  ngOnInit(): void {
    // TODO: remplace par un appel à ton service
    this.utilisateurs = this.seed();
    this.applyFilters();
  }

  applyFilters(): void {
    const q = this.query.trim().toLowerCase();
    this.filtered = this.utilisateurs.filter(u => {
      const inStatus = this.statusFilter ? u.etat === this.statusFilter : true;
      const txt = [
        u.nom, u.prenom, u.email, u.telephone,
        u.ville, u.pays, u.adresseLigne1, u.adresseLigne2, u.codePostal
      ].filter(Boolean).join(' ').toLowerCase();
      return inStatus && (q === '' || txt.includes(q));
    });

    // tri
    const getKey = (u: Utilisateur) => {
      if (this.sortKey === 'etat') return u.etat;
      if (this.sortKey === 'nom') return `${u.nom} ${u.prenom}`.toLowerCase();
      if (this.sortKey === 'email') return u.email.toLowerCase();
      if (this.sortKey === 'telephone') return u.telephone;
      if (this.sortKey === 'nbMembres') return u.membres?.length || 0;
      return (u as any)[this.sortKey];
    };
    this.filtered.sort((a,b) => {
      const va = getKey(a), vb = getKey(b);
      if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // pagination
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

  goToPage(p: number){ this.page = Math.max(1, Math.min(this.totalPages, p)); this.slicePage(); }
  nextPage(){ this.goToPage(this.page + 1); }
  prevPage(){ this.goToPage(this.page - 1); }
  slicePage(){ const start = (this.page - 1) * this.pageSize; this.paged = this.filtered.slice(start, start + this.pageSize); }

  clearSearch(){ this.query = ''; this.applyFilters(); }
  resetFilters(){ this.query=''; this.statusFilter=''; this.page=1; this.applyFilters(); }

  approve(u: Utilisateur){ u.etat = 'VALIDE'; this.applyFilters(); /* TODO: appel API */ }
  reject(u: Utilisateur){ u.etat = 'REFUSE'; this.applyFilters(); /* TODO: appel API */ }
  contact(u: Utilisateur){ window.location.href = `mailto:${u.email}`; }
  view(u: Utilisateur){ alert(`Détails de ${u.prenom} ${u.nom}`); /* TODO: ouvrir modale / route détail */ }
  remove(u: Utilisateur){
    if(confirm('Supprimer cette inscription ?')){
      this.utilisateurs = this.utilisateurs.filter(x => x.id !== u.id);
      this.applyFilters(); /* TODO: appel API */
    }
  }

  labelStatut(s: Statut){ return s==='NOUVEAU' ? 'Nouveau' : s==='VALIDE' ? 'Validé' : 'Refusé'; }

  trackById(_: number, item: Utilisateur){ return item.id; }

  // --- données de démonstration ---
  private seed(): Utilisateur[] {
    return [
      {
        id:'u1', role:'PARENT', nom:'Dupont', prenom:'Claire',
        email:'claire.dupont@mail.com', telephone:'0611223344',
        adresseLigne1:'15 rue des Lilas', codePostal:'69001', ville:'Lyon', pays:'France',
        membres:[
          { nom:'Dupont', prenom:'Léo', dateNaissance:'2013-04-02', ceinture:'Jaune' },
          { nom:'Dupont', prenom:'Lina', dateNaissance:'2016-10-21' }
        ],
        etat:'NOUVEAU'
      },
      {
        id:'u2', role:'MEMBRE', nom:'Martin', prenom:'Hugo',
        email:'hugo.martin@mail.com', telephone:'0677889900',
        adresseLigne1:'4 av. des Alpes', codePostal:'74000', ville:'Annecy', pays:'France',
        membres:[], etat:'VALIDE'
      },
      {
        id:'u3', role:'PARENT', nom:'Nguyen', prenom:'Thierry',
        email:'thierry.nguyen@mail.com', telephone:'0600000000',
        adresseLigne1:'10 chemin des Prés', adresseLigne2:'Bât. A', codePostal:'75012', ville:'Paris', pays:'France',
        membres:[{ nom:'Nguyen', prenom:'Minh', dateNaissance:'2012-07-15', ceinture:'Orange' }],
        etat:'REFUSE'
      }
    ];
  }
}
