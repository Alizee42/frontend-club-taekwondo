import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ClubService, Club } from '../../services/club.service';
import { labelFor as docLabelFor, normalizeStatus, unifyType } from '../../shared/documents/doc-utils';
import { UiTitleComponent } from '../../shared/ui/title/ui-title.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';

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
  role?: string;
  enfantNom: string;
  typeLabel: string;
  nomDocument: string;
  statut: Statut;
  dateDepot?: string;
  cheminFichier?: string;
}

@Component({
  selector: 'app-documents-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiTitleComponent, UiButtonComponent, UiTableComponent, UiModalComponent],
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

  // Vue: groupée par utilisateur ou tableau plat
  groupByUser = true;
  openGroups = new Map<string, boolean>();

  // Aperçu modal
  previewOpen = false;
  previewUrl: string = '';
  previewName: string = '';
  previewType: 'image' | 'pdf' | 'other' = 'other';

  // Colonnes pour <ui-table>
  tableColumns: UiTableColumn[] = [];
  groupedTableColumns: UiTableColumn[] = [];

  // Actions pour <ui-table>
  tableActions: Array<{ label: string; icon?: string; action: string; color?: string; show?: (row: any) => boolean; title?: string }> = [
    { label: 'Valider', icon: 'ri-check-line', action: 'approve', color: '#16a34a', show: (row: any) => normalizeStatus(row.statut) !== 'validé', title: 'Valider' },
    { label: 'Refuser', icon: 'ri-close-line', action: 'reject', color: '#dc2626', show: (row: any) => normalizeStatus(row.statut) !== 'refusé', title: 'Refuser' },
    { label: 'Télécharger', icon: 'ri-download-line', action: 'download', color: 'var(--blue-main)', show: (row: any) => normalizeStatus(row.statut) === 'validé', title: 'Télécharger' }
  ];

  // no templates required

  constructor(private http: HttpClient, private clubService: ClubService) {}

  ngOnInit(): void {
    // Initialise colonnes une fois le composant prêt (nécessite this.rawUrl)
    this.tableColumns = [
      { key: 'clubNom', label: 'Club' },
      { key: 'utilisateurNom', label: 'Utilisateur' },
      { key: 'utilisateurEmail', label: 'Email' },
      { key: 'enfantNom', label: 'Enfant' },
      { key: 'typeLabel', label: 'Type' },
      {
        key: 'nomDocument',
        label: 'Nom du fichier',
        type: 'button',
        buttonLabel: '',
        buttonIcon: 'ri-eye-line',
        buttonVariant: 'primary',
        buttonCustomClass: 'btn-view btn-icon-only',
        buttonDisabled: (row: any) => !this.rawUrl(row.cheminFichier),
        buttonOnClick: (row: any) => this.openPreview(this.rawUrl(row.cheminFichier), row.nomDocument)
      },
      {
        key: 'statut',
        label: 'Statut',
        type: 'text',
        display: (row: any) => {
          const s = normalizeStatus(row.statut);
          return s === 'en_attente' ? 'en attente' : s;
        },
        textClass: (row: any) => {
          const s = normalizeStatus(row.statut);
          if (s === 'validé') return 'badge-pill badge-success';
          if (s === 'refusé') return 'badge-pill badge-danger';
          return 'badge-pill badge-warn';
        }
      },
      {
        key: 'dateDepot',
        label: 'Date',
        type: 'date',
        display: (row: any) => row?.dateDepot ? new Date(row.dateDepot).toLocaleDateString('fr-FR') : ''
      }
    ];

    // colonnes pour vue groupée: masque Utilisateur/Email (déjà dans l'en-tête de groupe)
    this.groupedTableColumns = this.tableColumns.filter(c => c.key !== 'utilisateurNom' && c.key !== 'utilisateurEmail');

    this.loadClubs();
  }

  // no AfterViewInit needed

  private loadClubs() {
    this.clubService.getClubs().subscribe({
      next: (clubs) => { this.clubs = clubs || []; this.loadDocs(); },
      error: () => { this.clubs = []; this.loadDocs(); }
    });
  }

  onSelectClub() { this.loadDocs(); }

  loadDocs() {
    const qp = this.selectedClubId ? `?clubId=${this.selectedClubId}` : '';
    this.http.get<DocumentDTO[]>(`${this.API_BASE}/documents/all${qp}`).subscribe({
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
            role: (d.utilisateur?.role || '').toString().trim().toUpperCase() || undefined,
            enfantNom: enfantNom || '—',
            typeLabel: docLabelFor(unifyType(d.typeDocument)),
            nomDocument: d.nomDocument || '—',
            statut: normalizeStatus(d.status),
            dateDepot: d.dateDepot,
            cheminFichier: d.cheminFichier
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
    // Réinitialise l'état des groupes ouverts quand on change le filtre
    const keys = new Set(this.filtered.map(r => `${r.utilisateurNom}||${r.utilisateurEmail}`));
    // Ferme les groupes qui n'existent plus
    Array.from(this.openGroups.keys()).forEach(k => { if (!keys.has(k)) this.openGroups.delete(k); });
  }

  onSearchChange() { this.applyFilters(); }
  onStatutChange() { this.applyFilters(); }

  // ====== URL helpers ======
  private encodeLastSegment(p: string): string {
    const parts = p.split('/');
    const last = parts.pop() || '';
    let decoded = last;
    try { decoded = decodeURIComponent(last); } catch { /* ignore */ }
    parts.push(encodeURIComponent(decoded));
    return parts.join('/');
  }

  private buildUrl(path?: string): string {
    if (!path) return '';
    let p = String(path).trim();
    if (/^https?:\/\//i.test(p)) return p; // direct URL (Drive, etc.)
    p = p.replace(/^\.?\/+/, '');
    if (!p.startsWith('documents/')) p = `documents/${p}`;
    p = `/api/uploads/documents/${p.replace(/^documents\//, '')}`;
    return this.encodeLastSegment(p);
  }

  rawUrl(path?: string): string { return this.buildUrl(path); }

  handleAction(event: { action: string; row: Row }) {
    const { action, row } = event;
    if (action === 'download') {
      if (normalizeStatus(row.statut) !== 'validé') return;
      const url = this.rawUrl(row.cheminFichier);
      if (url) window.open(url, '_blank');
      return;
    }
    if (action === 'approve') { this.approve(row); return; }
    if (action === 'reject') { this.reject(row); return; }
    if (action === 'view') { this.onDownload(row.id, row.cheminFichier); return; }
  }

  onDownload(id: number | string, cheminFichier?: string) {
    const url = this.rawUrl(cheminFichier);
    if (url) window.open(url, '_blank');
  }

  // ====== Aperçu modal ======
  private detectType(url: string): 'image' | 'pdf' | 'other' {
    const u = (url || '').toLowerCase();
    if (u.match(/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/)) return 'image';
    if (u.match(/\.(pdf)(\?.*)?$/)) return 'pdf';
    return 'other';
  }

  openPreview(url?: string, name?: string) {
    if (!url) return;
    this.previewUrl = url;
    this.previewName = name || 'Aperçu';
    this.previewType = this.detectType(url);
    this.previewOpen = true;
  }

  closePreview() {
    this.previewOpen = false;
    this.previewUrl = '';
    this.previewName = '';
    this.previewType = 'other';
  }

  // ====== Validation / Refus ======
  approve(row: Row) {
    this.http.put(`${this.API_BASE}/documents/${row.id}/valider`, null, { observe: 'response' })
      .subscribe({
        next: () => {
          row.statut = 'validé';
          // synchronise dans filtered/rows
          this.rows = this.rows.map(r => r.id === row.id ? { ...r, statut: 'validé' } : r);
          this.applyFilters();
        },
        error: (err) => console.error('Erreur validation document', err)
      });
  }

  reject(row: Row) {
    this.http.put(`${this.API_BASE}/documents/${row.id}/refuser`, null, { observe: 'response' })
      .subscribe({
        next: () => {
          row.statut = 'refusé';
          this.rows = this.rows.map(r => r.id === row.id ? { ...r, statut: 'refusé' } : r);
          this.applyFilters();
        },
        error: (err) => console.error('Erreur refus document', err)
      });
  }

  // ====== Groupement par utilisateur ======
  get userGroups(): Array<{ key: string; utilisateurNom: string; utilisateurEmail: string; docs: Row[]; isOpen: boolean }>{
    const map = new Map<string, { utilisateurNom: string; utilisateurEmail: string; docs: Row[] }>();
    (this.filtered || []).forEach(r => {
      const key = `${r.utilisateurNom}||${r.utilisateurEmail}`;
      if (!map.has(key)) {
        map.set(key, { utilisateurNom: r.utilisateurNom, utilisateurEmail: r.utilisateurEmail, docs: [] });
      }
      map.get(key)!.docs.push(r);
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v, isOpen: this.openGroups.get(key) ?? false }));
  }

  toggleGroup(key: string) {
    const curr = this.openGroups.get(key) ?? false;
    this.openGroups.set(key, !curr);
  }

  // ====== Style et infos pour entête de groupe ======
  getGroupClass(docs: Row[]): string {
    if (!docs || !docs.length) return '';
    const hasWaiting = docs.some(d => normalizeStatus(d.statut) === 'en_attente');
    const hasRefused = docs.some(d => normalizeStatus(d.statut) === 'refusé');
    if (hasWaiting) return 'status-warn';
    if (hasRefused) return 'status-danger';
    // tout validé (ou aucun statut particulier)
    return 'status-success';
  }

  countStatus(docs: Row[], s: Statut): number {
    return (docs || []).filter(d => normalizeStatus(d.statut) === s).length;
  }

  // ====== Rôle/Enfants pour rendu groupé (harmonisation Admin) ======
  private normRole(v?: string): string {
    return (v || '').toString().trim().toUpperCase();
  }

  isParentGroup(docs: Row[]): boolean {
    if (!docs || !docs.length) return false;
    // Si au moins un rôle PARENT, on considère le groupe comme Parent
    const hasParentRole = docs.some(d => this.normRole(d.role) === 'PARENT');
    if (hasParentRole) return true;
    // fallback: s'il y a des enfants nommés
    return this.groupChildNames(docs).length > 0;
  }

  hasKidsGroup(docs: Row[]): boolean { return this.groupChildNames(docs).length > 0; }

  groupChildNames(docs: Row[]): string[] {
    const set = new Set<string>();
    (docs || []).forEach(d => {
      const n = (d.enfantNom || '').trim();
      if (n && n !== '—') set.add(n);
    });
    return Array.from(set.values());
  }

  // ====== Actions groupées (harmonisation avec Admin) ======
  validerTous(docs: Row[]) {
    (docs || [])
      .filter(d => normalizeStatus(d.statut) === 'en_attente')
      .forEach(d => this.approve(d));
  }

  refuserTous(docs: Row[]) {
    (docs || [])
      .filter(d => normalizeStatus(d.statut) === 'en_attente')
      .forEach(d => this.reject(d));
  }
}

