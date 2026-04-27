import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ClubService, Club } from '../../services/club.service';
import { labelFor as docLabelFor, normalizeStatus, unifyType } from '../../shared/documents/doc-utils';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { ToastService } from '../../shared/toast/toast.service';
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

type UserGroup = { key: string; utilisateurNom: string; utilisateurEmail: string; clubNom: string; docs: Row[] };

@Component({
  selector: 'app-documents-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiTableComponent, UiModalComponent, PageHeaderComponent],
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

  // Master-detail
  selectedGroup: UserGroup | null = null;
  currentPage = 1;
  readonly pageSize = 12;

  // Aperçu modal
  previewOpen = false;
  previewUrl: string = '';
  previewName: string = '';
  previewType: 'image' | 'pdf' | 'other' = 'other';

  tableColumns: UiTableColumn[] = [];
  groupedTableColumns: UiTableColumn[] = [];

  tableActions: Array<{ label: string; icon?: string; action: string; color?: string; show?: (row: any) => boolean; title?: string }> = [
    { label: 'Valider',      icon: 'ri-check-line',    action: 'approve',   color: '#16a34a', show: (row: any) => normalizeStatus(row.statut) !== 'validé',  title: 'Valider' },
    { label: 'Refuser',      icon: 'ri-close-line',    action: 'reject',    color: '#dc2626', show: (row: any) => normalizeStatus(row.statut) !== 'refusé',  title: 'Refuser' },
    { label: 'Télécharger',  icon: 'ri-download-line', action: 'download',  color: 'var(--brand-primary)', show: (row: any) => !!row.cheminFichier,         title: 'Télécharger' }
  ];

  constructor(private http: HttpClient, private clubService: ClubService, private toast: ToastService) {}

  ngOnInit(): void {
    this.tableColumns = [
      { key: 'clubNom', label: 'Club' },
      { key: 'utilisateurNom', label: 'Utilisateur' },
      { key: 'utilisateurEmail', label: 'Email' },
      { key: 'enfantNom', label: 'Enfant' },
      { key: 'typeLabel', label: 'Type' },
      {
        key: 'nomDocument', label: 'Aperçu',
        type: 'button', buttonLabel: '', buttonIcon: 'ri-eye-line', buttonVariant: 'primary',
        buttonCustomClass: 'btn-view btn-icon-only',
        buttonDisabled: (row: any) => !this.rawUrl(row.cheminFichier),
        buttonOnClick: (row: any) => this.openPreview(this.rawUrl(row.cheminFichier), row.nomDocument)
      },
      {
        key: 'statut', label: 'Statut', type: 'text',
        display: (row: any) => { const s = normalizeStatus(row.statut); return s === 'en_attente' ? 'en attente' : s; },
        textClass: (row: any) => {
          const s = normalizeStatus(row.statut);
          if (s === 'validé') return 'badge-pill badge-success';
          if (s === 'refusé') return 'badge-pill badge-danger';
          return 'badge-pill badge-warn';
        }
      },
      {
        key: 'dateDepot', label: 'Date', type: 'date',
        display: (row: any) => row?.dateDepot ? new Date(row.dateDepot).toLocaleDateString('fr-FR') : ''
      }
    ];

    this.groupedTableColumns = this.tableColumns.filter(
      c => c.key !== 'utilisateurNom' && c.key !== 'utilisateurEmail' && c.key !== 'clubNom'
    );

    this.loadClubs();
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
            id: d.id, clubId,
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
      error: (err) => {
        console.error('Erreur load docs', err);
        this.toast.error('Erreur lors du chargement des documents.');
        this.rows = [];
        this.filtered = [];
      }
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
    this.currentPage = 1;
    // Met à jour le groupe sélectionné si encore présent, sinon le désélectionne
    if (this.selectedGroup) {
      const still = this.userGroups.find(g => g.key === this.selectedGroup!.key);
      this.selectedGroup = still ?? null;
    }
  }

  onSearchChange() { this.applyFilters(); }
  onStatutChange() { this.applyFilters(); }

  // ====== Groupes ======
  get userGroups(): UserGroup[] {
    const map = new Map<string, UserGroup>();
    (this.filtered || []).forEach(r => {
      const key = `${r.utilisateurNom}||${r.utilisateurEmail}`;
      if (!map.has(key)) {
        map.set(key, { key, utilisateurNom: r.utilisateurNom, utilisateurEmail: r.utilisateurEmail, clubNom: r.clubNom, docs: [] });
      }
      map.get(key)!.docs.push(r);
    });
    return Array.from(map.values());
  }

  // ====== Master-detail ======
  get totalPages(): number { return Math.ceil(this.userGroups.length / this.pageSize); }

  get paginatedGroups(): UserGroup[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.userGroups.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const p = this.currentPage;
    const result: number[] = [1];
    if (p > 3) result.push(0);
    for (let i = Math.max(2, p - 1); i <= Math.min(total - 1, p + 1); i++) result.push(i);
    if (p < total - 2) result.push(0);
    result.push(total);
    return result;
  }

  selectGroup(g: UserGroup) { this.selectedGroup = g; }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
  }

  // ====== Statut groupe ======
  getGroupStatus(docs: Row[]): 'en_attente' | 'validé' | 'refusé' {
    if (!docs?.length) return 'validé';
    if (docs.some(d => normalizeStatus(d.statut) === 'en_attente')) return 'en_attente';
    if (docs.some(d => normalizeStatus(d.statut) === 'refusé')) return 'refusé';
    return 'validé';
  }

  countStatus(docs: Row[], s: Statut): number {
    return (docs || []).filter(d => normalizeStatus(d.statut) === s).length;
  }

  private normRole(v?: string): string { return (v || '').toString().trim().toUpperCase(); }

  isParentGroup(docs: Row[]): boolean {
    if (!docs?.length) return false;
    if (docs.some(d => this.normRole(d.role) === 'PARENT')) return true;
    return this.groupChildNames(docs).length > 0;
  }

  hasKidsGroup(docs: Row[]): boolean { return this.groupChildNames(docs).length > 0; }

  groupChildNames(docs: Row[]): string[] {
    const set = new Set<string>();
    (docs || []).forEach(d => { const n = (d.enfantNom || '').trim(); if (n && n !== '—') set.add(n); });
    return Array.from(set.values());
  }

  // ====== Actions groupées ======
  validerTous(docs: Row[]) {
    (docs || []).filter(d => normalizeStatus(d.statut) === 'en_attente').forEach(d => this.approve(d));
  }

  refuserTous(docs: Row[]) {
    (docs || []).filter(d => normalizeStatus(d.statut) === 'en_attente').forEach(d => this.reject(d));
  }

  // ====== Validation / Refus ======
  approve(row: Row) {
    this.http.put(`${this.API_BASE}/documents/${row.id}/valider`, null, { observe: 'response' }).subscribe({
      next: () => {
        this.rows = this.rows.map(r => r.id === row.id ? { ...r, statut: 'validé' } : r);
        this.applyFilters();
        this.toast.success('Document validé.');
      },
      error: (err) => { console.error(err); this.toast.error('Erreur lors de la validation du document.'); }
    });
  }

  reject(row: Row) {
    this.http.put(`${this.API_BASE}/documents/${row.id}/refuser`, null, { observe: 'response' }).subscribe({
      next: () => {
        this.rows = this.rows.map(r => r.id === row.id ? { ...r, statut: 'refusé' } : r);
        this.applyFilters();
        this.toast.success('Document refusé.');
      },
      error: (err) => { console.error(err); this.toast.error('Erreur lors du refus du document.'); }
    });
  }

  handleAction(event: { action: string; row: Row }) {
    const { action, row } = event;
    if (action === 'approve') { this.approve(row); return; }
    if (action === 'reject')  { this.reject(row);  return; }
    if (action === 'download') {
      const url = this.rawUrl(row.cheminFichier);
      if (url) window.open(url, '_blank');
    }
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

  closePreview() { this.previewOpen = false; this.previewUrl = ''; this.previewName = ''; this.previewType = 'other'; }

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
    if (/^https?:\/\//i.test(p)) return p;
    p = p.replace(/^\.?\/+/, '');
    if (!p.startsWith('documents/')) p = `documents/${p}`;
    p = `/api/uploads/documents/${p.replace(/^documents\//, '')}`;
    return this.encodeLastSegment(p);
  }

  rawUrl(path?: string): string { return this.buildUrl(path); }
}
