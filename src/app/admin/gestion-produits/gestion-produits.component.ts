import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AuthService, Utilisateur } from '../../services/auth.service';
import { ClubService, Club } from '../../services/club.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';

interface ProduitDTO {
  id?: number;
  nom: string;
  description: string;
  prix: number;
  stock: number;
  categorie: string;
  imageUrl: string;
  clubId?: number;
}

const VIDE: ProduitDTO = {
  nom: '', description: '', prix: 0, stock: 0, categorie: 'TENUE', imageUrl: ''
};

@Component({
  selector: 'app-gestion-produits',
  standalone: true,
  templateUrl: './gestion-produits.component.html',
  styleUrls: ['./gestion-produits.component.css'],
  imports: [CommonModule, FormsModule, PageHeaderComponent, UiButtonComponent, UiModalComponent, KpiCardComponent, KpiGridComponent, UiTableComponent],
})
export class GestionProduitsComponent implements OnInit {

  @ViewChild('imageFileInput') imageFileInput?: ElementRef<HTMLInputElement>;

  produits: ProduitDTO[] = [];
  filtered: ProduitDTO[] = [];
  search = '';
  loading = false;

  get nbProduits()  { return this.produits.length; }
  get nbEnStock()   { return this.produits.filter(p => p.stock > 0).length; }
  get nbRupture()   { return this.produits.filter(p => p.stock === 0).length; }
  error = '';

  modalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  form: ProduitDTO = { ...VIDE };
  saving = false;

  imagePreview: string | null = null;
  uploading = false;

  readonly categories = ['TENUE', 'PROTECTION', 'ACCESSOIRE', 'AUTRE'];

  // ADMIN : club fixe (son propre club). SUPER_ADMIN : doit choisir un club dans la liste.
  isClubLocked = false;
  clubs: Club[] = [];
  selectedClubId: number | null = null;
  selectedClubName = '';

  tableColumns: UiTableColumn[] = [
    { key: 'imageUrl', label: 'Image', type: 'image', width: '80px' },
    { key: 'nom', label: 'Produit' },
    {
      key: 'prix',
      label: 'Prix',
      display: (row: ProduitDTO) => `${Number(row.prix ?? 0).toFixed(2)} €`
    },
    {
      key: 'stock',
      label: 'Stock',
      textClass: (row: ProduitDTO) => row.stock === 0 ? 'stock-zero' : (row.stock <= 5 ? 'stock-low' : '')
    },
    { key: 'categorie', label: 'Catégorie' }
  ];
  tableActions = [
    { label: '', icon: 'ri-edit-line', action: 'edit', color: '#2563eb' },
    { label: '', icon: 'ri-delete-bin-line', action: 'delete', color: '#e53935' }
  ];

  private get headers(): HttpHeaders {
    return this.auth.getAuthHeaders();
  }

  private get api(): string {
    return `${environment.apiUrl}/produits`;
  }

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private clubService: ClubService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const utilisateur: Utilisateur | null = this.auth.getUtilisateurConnecte();
    const clubId = utilisateur?.['clubId'];
    // Un SUPER_ADMIN ne doit jamais être verrouillé sur un club, même si son compte
    // a un clubId renseigné (ex: comptes de seed) — seul le rôle fait foi ici.
    const role = (utilisateur?.['role'] ?? this.auth.getRole() ?? '').toString().toUpperCase();

    if (clubId && role !== 'SUPER_ADMIN') {
      this.isClubLocked = true;
      this.selectedClubId = clubId;
      this.clubService.getClubs().subscribe({
        next: (clubs) => {
          const club = clubs?.find(c => c.id === clubId);
          this.selectedClubName = club ? (club.nom || club.name) : '';
        },
        error: () => {}
      });
      this.charger();
      return;
    }

    // SUPER_ADMIN : pas de club propre, doit en choisir un explicitement.
    this.clubService.getClubs().subscribe({
      next: (clubs) => { this.clubs = clubs || []; },
      error: () => this.toast.error('Impossible de charger la liste des clubs.')
    });
  }

  onSelectClub(clubId: number | null): void {
    this.selectedClubId = clubId;
    const club = this.clubs.find(c => c.id === clubId);
    this.selectedClubName = club ? (club.nom || club.name) : '';
    if (clubId) this.charger();
    else { this.produits = []; this.filtrer(); }
  }

  charger(): void {
    if (!this.selectedClubId) return;
    this.loading = true;
    this.error = '';

    this.http.get<ProduitDTO[]>(`${this.api}/club/${this.selectedClubId}`, { headers: this.headers }).subscribe({
      next: data => {
        this.produits = data;
        this.filtrer();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les produits.';
        this.loading = false;
      }
    });
  }

  filtrer(): void {
    const q = this.search.toLowerCase().trim();
    this.filtered = q
      ? this.produits.filter(p =>
          p.nom.toLowerCase().includes(q) ||
          p.categorie?.toLowerCase().includes(q)
        )
      : [...this.produits];
  }

  ouvrirAjout(): void {
    this.form = { ...VIDE };
    this.imagePreview = null;
    this.modalMode = 'add';
    this.modalOpen = true;
  }

  ouvrirEdit(p: ProduitDTO): void {
    this.form = { ...p };
    this.imagePreview = p.imageUrl || null;
    this.modalMode = 'edit';
    this.modalOpen = true;
  }

  fermerModal(): void {
    this.modalOpen = false;
    this.saving = false;
    this.imagePreview = null;
    if (this.imageFileInput) {
      this.imageFileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Aperçu local immédiat
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);

    // Upload vers le serveur
    this.uploading = true;
    const formData = new FormData();
    formData.append('image', file);

    this.http.post<{ url: string }>(`${environment.apiUrl}/produits/upload-image`, formData, { headers: this.headers }).subscribe({
      next: res => {
        this.form.imageUrl = res.url;
        this.uploading = false;
      },
      error: () => {
        this.toast.error("Erreur lors de l'upload de l'image.");
        this.uploading = false;
      }
    });
  }

  sauvegarder(): void {
    if (!this.selectedClubId) { this.toast.error('Choisis un club avant d\'enregistrer.'); return; }
    if (!this.form.nom?.trim()) { this.toast.error('Le nom est obligatoire.'); return; }
    if (!this.form.prix || this.form.prix <= 0) { this.toast.error('Le prix doit être supérieur à 0.'); return; }
    if (this.form.stock < 0) { this.toast.error('Le stock ne peut pas être négatif.'); return; }

    this.saving = true;
    const payload = { ...this.form, clubId: this.selectedClubId };

    const req = this.modalMode === 'add'
      ? this.http.post<ProduitDTO>(this.api, payload, { headers: this.headers })
      : this.http.put<ProduitDTO>(`${this.api}/${this.form.id}`, payload, { headers: this.headers });

    req.subscribe({
      next: saved => {
        if (this.modalMode === 'add') {
          this.produits = [saved, ...this.produits];
          this.toast.success('Produit créé avec succès.');
        } else {
          this.produits = this.produits.map(p => p.id === saved.id ? saved : p);
          this.toast.success('Produit mis à jour.');
        }
        this.filtrer();
        this.fermerModal();
      },
      error: () => {
        this.toast.error('Une erreur est survenue. Vérifiez que le nom est unique.');
        this.saving = false;
      }
    });
  }

  supprimer(p: ProduitDTO): void {
    if (!p.id) return;
    if (!confirm(`Supprimer le produit "${p.nom}" ?`)) return;

    this.http.delete(`${this.api}/${p.id}`, { headers: this.headers }).subscribe({
      next: () => {
        this.produits = this.produits.filter(x => x.id !== p.id);
        this.filtrer();
        this.toast.success('Produit supprimé.');
      },
      error: () => {
        this.toast.error('Impossible de supprimer ce produit.');
      }
    });
  }

  handleTableAction(event: { action: string; row: ProduitDTO }): void {
    if (event.action === 'edit') {
      this.ouvrirEdit(event.row);
    } else if (event.action === 'delete') {
      this.supprimer(event.row);
    }
  }
}
