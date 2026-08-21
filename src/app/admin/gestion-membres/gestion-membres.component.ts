import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';
import { ClubService } from '../../services/club.service';

@Component({
  selector: 'app-gestion-membres',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    UiTableComponent, UiModalComponent, UiButtonComponent,
    PageHeaderComponent, KpiCardComponent, KpiGridComponent
  ],
  templateUrl: './gestion-membres.component.html',
  styleUrls: ['./gestion-membres.component.css']
})
export class GestionMembresComponent implements OnInit {

  activeTab: 'comptes' | 'pratiquants' = 'comptes';
  clubId: number | null = null;

  // ── Comptes (Utilisateurs) ──────────────────────────────────
  comptes: any[] = [];
  loadingComptes = false;
  errorComptes: string | null = null;

  comptesColumns: UiTableColumn[] = [
    { key: 'identite',  label: 'Identité',
      render: r => `${r.prenom ?? ''} ${r.nom ?? ''}`.trim() || '—',
      iconClass: r => this.genre2IconClass(r.genre)
    },
    { key: 'email',     label: 'Email',     render: r => r.email ?? '—' },
    { key: 'role',      label: 'Rôle',
      render: r => r.role === 'PARENT' ? 'Parent' : r.role === 'MEMBRE' ? 'Membre' : r.role === 'ADMIN' ? 'Admin' : (r.role ?? '—'),
      textClass: (r: any) => r.role === 'PARENT' ? 'badge badge--teal' : r.role === 'MEMBRE' ? 'badge badge--blue' : r.role === 'ADMIN' ? 'badge badge--amber' : 'badge badge--gray'
    },
    { key: 'telephone', label: 'Téléphone', render: r => r.telephone || '—' }
  ];

  comptesActions = [
    { label: 'Éditer',     icon: 'ri-edit-2-line',      action: 'edit',   color: '#1976d2' },
    { label: 'Supprimer',  icon: 'ri-delete-bin-6-line', action: 'delete', color: '#e53935' }
  ];

  get nbComptes()      { return this.comptes.length; }
  get nbParents()      { return this.comptes.filter(u => u.role === 'PARENT').length; }
  get nbMembresRole()  { return this.comptes.filter(u => u.role === 'MEMBRE').length; }

  // ── Pratiquants (Membres sportifs) ──────────────────────────
  pratiquants: any[] = [];
  loadingPratiquants = false;
  errorPratiquants: string | null = null;

  pratiquantsColumns: UiTableColumn[] = [
    { key: 'identite',      label: 'Identité',
      render: r => `${r.prenom ?? ''} ${r.nom ?? ''}`.trim() || '—',
      iconClass: r => this.genre2IconClass(r.genre)
    },
    { key: 'ceinture',      label: 'Ceinture',    render: r => r.ceinture || '—' },
    { key: 'numeroLicence', label: 'N° Licence',  render: r => r.numeroLicence || '—' },
    { key: 'estAdulte',     label: 'Type',
      render: r => r.estAdulte ? 'Adulte' : 'Enfant',
      textClass: (r: any) => r.estAdulte ? 'badge badge--blue' : 'badge badge--amber'
    },
    { key: 'parentLabel',   label: 'Parent',      render: r => r.parentLabel || '—' },
    { key: 'compteLabel',   label: 'Compte',
      render: r => r.utilisateurId ? 'Compte actif' : 'Sans compte',
      textClass: (r: any) => r.utilisateurId ? 'badge badge--green' : 'badge badge--gray',
      iconClass: (r: any) => r.utilisateurId ? 'ri-checkbox-circle-line cell-icon--male' : 'ri-forbid-line cell-icon--neutral'
    }
  ];

  pratiquantsActions = [
    { label: 'Éditer',     icon: 'ri-edit-2-line',      action: 'edit',   color: '#1976d2' },
    { label: 'Supprimer',  icon: 'ri-delete-bin-6-line', action: 'delete', color: '#e53935' }
  ];

  get nbPratiquants() { return this.pratiquants.length; }
  get nbAdultes()     { return this.pratiquants.filter(m =>  m.estAdulte).length; }
  get nbEnfants()     { return this.pratiquants.filter(m => !m.estAdulte).length; }

  // ── Pagination ──────────────────────────────────────────────
  // Hauteurs fixes connues (px) :
  //   64  = header sticky
  //   16  = padding-top page-shell
  //   70  = app-page-header
  //   12  = gap
  //   46  = .gm-tabs
  //   24  = gap + margin-bottom tabs
  //   76  = ui-kpi-grid (3 cartes min-height 72px)
  //   12  = gap
  //   38  = .gm-info-box
  //   12  = gap
  //   48  = thead du tableau
  //   66  = controles pagination
  //   48  = padding-bottom page-shell + table-wrap
  private static readonly OVERHEAD_PX = 532;
  private static readonly ROW_H_PX    = 44;  // padding sp-3×2 + contenu
  private static readonly MIN_ROWS    = 5;

  pageSize = 10;

  @HostListener('window:resize')
  onResize(): void { this.calcPageSize(); }

  private calcPageSize(): void {
    const available = window.innerHeight - GestionMembresComponent.OVERHEAD_PX;
    const rows = Math.floor(available / GestionMembresComponent.ROW_H_PX);
    this.pageSize = Math.max(GestionMembresComponent.MIN_ROWS, rows);
    // Corriger les pages courantes si elles dépassent le nouveau total
    this.pageComptes     = Math.min(this.pageComptes,     this.totalPagesComptes);
    this.pagePratiquants = Math.min(this.pagePratiquants, this.totalPagesPratiquants);
  }

  pageComptes = 1;
  get totalPagesComptes()  { return Math.max(1, Math.ceil(this.comptes.length / this.pageSize)); }
  get pagedComptes()       { const s = (this.pageComptes - 1) * this.pageSize; return this.comptes.slice(s, s + this.pageSize); }

  pagePratiquants = 1;
  get totalPagesPratiquants() { return Math.max(1, Math.ceil(this.pratiquants.length / this.pageSize)); }
  get pagedPratiquants()      { const s = (this.pagePratiquants - 1) * this.pageSize; return this.pratiquants.slice(s, s + this.pageSize); }

  goToPageComptes(p: number)      { this.pageComptes     = Math.min(Math.max(1, p), this.totalPagesComptes); }
  goToPagePratiquants(p: number)  { this.pagePratiquants = Math.min(Math.max(1, p), this.totalPagesPratiquants); }

  // ── Export CSV ──────────────────────────────────────────────
  exportCSV(): void {
    if (this.activeTab === 'comptes') {
      this.exportComptesCSV();
    } else {
      this.exportPratiquantsCSV();
    }
  }

  private exportComptesCSV(): void {
    if (!this.comptes.length) return;
    const header = ['Nom', 'Prénom', 'Email', 'Rôle', 'Téléphone'];
    const rows = this.comptes.map(c => [
      c.nom ?? '', c.prenom ?? '', c.email ?? '', c.role ?? '', c.telephone ?? ''
    ]);
    this.downloadCSV(header, rows, 'comptes.csv');
  }

  private exportPratiquantsCSV(): void {
    if (!this.pratiquants.length) return;
    const header = ['Nom', 'Prénom', 'Ceinture', 'N° Licence', 'Type', 'Parent', 'Compte'];
    const rows = this.pratiquants.map(m => [
      m.nom ?? '', m.prenom ?? '', m.ceinture ?? '', m.numeroLicence ?? '',
      m.estAdulte ? 'Adulte' : 'Enfant', m.parentLabel ?? '',
      m.utilisateurId ? 'Compte actif' : 'Sans compte'
    ]);
    this.downloadCSV(header, rows, 'membres.csv');
  }

  private downloadCSV(header: string[], rows: (string | number)[][], filename: string): void {
    const csv = [header, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  // ── Modal ───────────────────────────────────────────────────
  modalOpen = false;
  modalTitle = '';
  modalMode: 'add-compte' | 'edit-compte' | 'add-pratiquant' | 'edit-pratiquant' = 'add-compte';
  editItem: any = null;

  confirmDeleteOpen = false;
  deleteItem: any = null;
  deleteType: 'compte' | 'pratiquant' = 'compte';
  deleteLoading = false;

  ceintureOptions = ['Blanche', 'Jaune', 'Orange', 'Verte', 'Bleue', 'Marron', 'Noire'];
  genreOptions = [
    { value: 'MASCULIN',    label: 'Homme' },
    { value: 'FEMININ',     label: 'Femme' },
    { value: 'NON_PRECISE', label: 'Non précisé' }
  ];

  genre2IconClass(genre: string): string {
    if (genre === 'MASCULIN') return 'ri-men-line cell-icon--male';
    if (genre === 'FEMININ')  return 'ri-women-line cell-icon--female';
    return 'ri-user-3-line cell-icon--neutral';
  }

  constructor(private http: HttpClient, private clubService: ClubService) {}

  ngOnInit(): void {
    this.calcPageSize();
    this.clubId = this.clubService.getSelectedClub()?.id ?? null;
    this.loadComptes();
    this.loadPratiquants();
  }

  setTab(tab: 'comptes' | 'pratiquants'): void {
    this.activeTab = tab;
  }

  // ── Comptes ─────────────────────────────────────────────────
  loadComptes(): void {
    if (!this.clubId) return;
    this.loadingComptes = true;
    this.errorComptes = null;
    this.http.get<any[]>(`${environment.apiUrl}/utilisateurs?clubId=${this.clubId}`).subscribe({
      next: data => { this.comptes = data; this.loadingComptes = false; this.pageComptes = 1; },
      error: () => { this.errorComptes = 'Impossible de charger les comptes.'; this.loadingComptes = false; }
    });
  }

  openAddCompte(): void {
    this.modalMode = 'add-compte';
    this.modalTitle = 'Ajouter un compte';
    this.editItem = { nom: '', prenom: '', email: '', role: 'MEMBRE', telephone: '', genre: '' };
    this.modalOpen = true;
  }

  onComptesAction(event: { action: string; row: any }): void {
    if (event.action === 'edit') {
      this.modalMode = 'edit-compte';
      this.modalTitle = 'Modifier le compte';
      this.editItem = { ...event.row };
      this.modalOpen = true;
    }
    if (event.action === 'delete') {
      this.deleteItem = event.row;
      this.deleteType = 'compte';
      this.confirmDeleteOpen = true;
    }
  }

  saveCompte(): void {
    if (!this.editItem || this.isSaveDisabled()) return;
    const payload = { ...this.editItem, clubId: this.clubId };
    const req = this.modalMode === 'add-compte'
      ? this.http.post(`${environment.apiUrl}/utilisateurs`, payload)
      : this.http.put(`${environment.apiUrl}/utilisateurs/${this.editItem.id}`, payload);
    req.subscribe({
      next: () => { this.closeModal(); this.loadComptes(); },
      error: () => { this.errorComptes = 'Erreur lors de l\'enregistrement du compte.'; }
    });
  }

  // ── Pratiquants ─────────────────────────────────────────────
  loadPratiquants(): void {
    if (!this.clubId) return;
    this.loadingPratiquants = true;
    this.errorPratiquants = null;
    this.http.get<any[]>(`${environment.apiUrl}/membres?clubId=${this.clubId}`).subscribe({
      next: data => {
        this.pratiquants = data.map(m => ({
          ...m,
          parentLabel: m.nomParent ? `${m.prenomParent ?? ''} ${m.nomParent}`.trim() : '—',
          compteLabel: m.utilisateurId ? '✓ Oui' : '— Non'
        }));
        this.pagePratiquants = 1;
        this.loadingPratiquants = false;
      },
      error: () => { this.errorPratiquants = 'Impossible de charger les pratiquants.'; this.loadingPratiquants = false; }
    });
  }

  openAddPratiquant(): void {
    this.modalMode = 'add-pratiquant';
    this.modalTitle = 'Ajouter un pratiquant';
    this.editItem = { nom: '', prenom: '', ceinture: '', numeroLicence: '', dateNaissance: '', estAdulte: true, genre: '' };
    this.modalOpen = true;
  }

  onPratiquantsAction(event: { action: string; row: any }): void {
    if (event.action === 'edit') {
      this.modalMode = 'edit-pratiquant';
      this.modalTitle = 'Modifier le pratiquant';
      this.editItem = { ...event.row };
      this.modalOpen = true;
    }
    if (event.action === 'delete') {
      this.deleteItem = event.row;
      this.deleteType = 'pratiquant';
      this.confirmDeleteOpen = true;
    }
  }

  savePratiquant(): void {
    if (!this.editItem || this.isSaveDisabled()) return;
    const payload = { ...this.editItem, clubId: this.clubId };
    const req = this.modalMode === 'add-pratiquant'
      ? this.http.post(`${environment.apiUrl}/membres`, payload)
      : this.http.put(`${environment.apiUrl}/membres/${this.editItem.id}`, payload);
    req.subscribe({
      next: () => { this.closeModal(); this.loadPratiquants(); },
      error: () => { this.errorPratiquants = 'Erreur lors de l\'enregistrement du pratiquant.'; }
    });
  }

  // ── Suppression avec confirmation ───────────────────────────
  confirmDelete(): void {
    if (!this.deleteItem) return;
    this.deleteLoading = true;
    const url = this.deleteType === 'compte'
      ? `${environment.apiUrl}/utilisateurs/${this.deleteItem.id}`
      : `${environment.apiUrl}/membres/${this.deleteItem.id}`;
    this.http.delete(url).subscribe({
      next: () => {
        this.deleteLoading = false;
        this.closeDeleteConfirm();
        if (this.deleteType === 'compte') this.loadComptes();
        else this.loadPratiquants();
      },
      error: () => {
        this.deleteLoading = false;
        if (this.deleteType === 'compte') this.errorComptes = 'Erreur lors de la suppression.';
        else this.errorPratiquants = 'Erreur lors de la suppression.';
        this.closeDeleteConfirm();
      }
    });
  }

  // ── Commun ──────────────────────────────────────────────────
  closeModal(): void { this.modalOpen = false; this.editItem = null; }
  closeDeleteConfirm(): void { this.confirmDeleteOpen = false; this.deleteItem = null; }

  isCompteModal(): boolean {
    return this.modalMode === 'add-compte' || this.modalMode === 'edit-compte';
  }

  isSaveDisabled(): boolean {
    if (!this.editItem) return true;
    if (this.isCompteModal()) {
      return !this.editItem.nom?.trim() || !this.editItem.prenom?.trim()
          || !this.editItem.email?.trim() || !this.editItem.role;
    }
    return !this.editItem.nom?.trim() || !this.editItem.prenom?.trim();
  }
}
