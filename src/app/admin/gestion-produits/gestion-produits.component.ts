import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

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
  imports: [CommonModule, FormsModule, PageHeaderComponent, UiButtonComponent, UiModalComponent, KpiCardComponent, KpiGridComponent],
})
export class GestionProduitsComponent implements OnInit {

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

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

  confirmId: number | null = null;
  confirmOpen = false;
  deleting = false;

  readonly categories = ['TENUE', 'PROTECTION', 'ACCESSOIRE', 'AUTRE'];

  private get headers(): HttpHeaders {
    return this.auth.getAuthHeaders();
  }

  private get api(): string {
    return `${environment.apiUrl}/produits`;
  }

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.loading = true;
    this.error = '';
    const user = this.auth.getUtilisateurConnecte();
    const clubId = user?.['clubId'];

    const url = clubId ? `${this.api}/club/${clubId}` : this.api;

    this.http.get<ProduitDTO[]>(url, { headers: this.headers }).subscribe({
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
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);

    // Upload to server
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

  triggerFileInput(): void {
    this.fileInputRef.nativeElement.click();
  }

  sauvegarder(): void {
    if (!this.form.nom?.trim()) { this.toast.error('Le nom est obligatoire.'); return; }
    if (!this.form.prix || this.form.prix <= 0) { this.toast.error('Le prix doit être supérieur à 0.'); return; }
    if (this.form.stock < 0) { this.toast.error('Le stock ne peut pas être négatif.'); return; }

    this.saving = true;
    const payload = { ...this.form };

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

  demanderSuppression(p: ProduitDTO): void {
    this.confirmId = p.id ?? null;
    this.confirmOpen = true;
  }

  annulerSuppression(): void {
    this.confirmId = null;
    this.confirmOpen = false;
  }

  confirmerSuppression(): void {
    if (!this.confirmId) return;
    this.deleting = true;
    this.http.delete(`${this.api}/${this.confirmId}`, { headers: this.headers }).subscribe({
      next: () => {
        this.produits = this.produits.filter(p => p.id !== this.confirmId);
        this.filtrer();
        this.toast.success('Produit supprimé.');
        this.annulerSuppression();
        this.deleting = false;
      },
      error: () => {
        this.toast.error('Impossible de supprimer ce produit.');
        this.deleting = false;
      }
    });
  }
}
