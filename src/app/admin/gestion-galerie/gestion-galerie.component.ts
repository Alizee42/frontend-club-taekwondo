import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GalerieService, Galerie } from '../../services/galerie.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UiTableComponent, UiTableColumn } from '../../shared/components/ui-table/ui-table.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-gestion-galerie',
  templateUrl: './gestion-galerie.component.html',
  styleUrls: ['./gestion-galerie.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, UiTableComponent, UiModalComponent, UiButtonComponent, PageHeaderComponent],
})
export class GestionGalerieComponent implements OnInit {
  images: Galerie[] = [];
  newImage: Partial<Galerie> = {};
  imageUrl: string | null = null;
  afficherFormulaire = false;
  errorMsg: string | null = null;
  // colonnes pour ui-table
  tableColumns: UiTableColumn[] = [];
  tableActions = [
    { label: 'Modifier', action: 'edit', color: 'primary', icon: 'material-icons', iconText: 'edit' },
    { label: 'Supprimer', action: 'delete', color: 'danger', icon: 'material-icons', iconText: 'delete' }
  ];

  // Pour la modale (aligné avec super-admin)
  modalOpen = false;
  modalTitle = '';
  formImage: Partial<Galerie> = {};
  editMode = false;

  @ViewChild('imageFileInput') imageFileInput?: ElementRef<HTMLInputElement>;

  constructor(private galerieService: GalerieService, private authService: AuthService, private readonly toast: ToastService) {}


  ngOnInit(): void {
    // Initialiser les colonnes du tableau
    this.tableColumns = [
      {
        key: 'imageUrl',
        label: 'Image',
        type: 'image',
        cellClass: 'image-cell'
      },
      { key: 'titre', label: 'Titre' },
      { key: 'description', label: 'Description' }
    ];

    // Charger les images du club de l'utilisateur connecté
    const user = this.authService.getUtilisateurConnecte();
    const clubId = user?.['clubId'] ?? null;
    if (clubId) {
      this.loadImages(clubId);
    } else {
      // fallback: charger aucune image ou toutes selon votre choix (ici on ne charge rien)
      console.warn('[GestionGalerie] clubId utilisateur introuvable — aucune galerie chargée');
      this.images = [];
    }
  }

  loadImages(clubId: number): void {
    this.galerieService.getGaleriesByClub(clubId).subscribe(
      (data) => {
        // Normaliser l'URL des images : construire une URL complète vers le dossier uploads du backend.
        // backend static files sont souvent servis sur la racine /uploads (ex: http://localhost:8080/uploads/...).
        const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');
        this.images = data.map(img => {
          let raw = img.imageUrl || '';
          // Retirer un éventuel préfixe 'galerie/' renvoyé par l'API
          if (raw.startsWith('galerie/')) raw = raw.replace(/^galerie\//, '');
          let full = '';
          if (!raw) {
            full = '';
          } else if (raw.startsWith('http') || raw.startsWith('/')) {
            // déjà une URL absolue ou commençant par / : on l'utilise telle quelle
            full = raw;
          } else {
            // essayer upload spécifique galerie, puis fallback /uploads/
            full = `${apiBase}/uploads/galerie/${encodeURIComponent(raw)}`;
            // Note: impossible de tester l'existence ici — si ça ne marche pas, on peut basculer sur `${apiBase}/uploads/${raw}`
            // pour compatibilité avec les chemins qui ne sont pas dans /galerie
            // Préparer aussi une variante fallback dans l'objet si nécessaire
            // (ici on choisit la variante /uploads/galerie/ par défaut)
          }
          return { ...img, imageUrl: full };
        });
      },
      (error) => {
        console.error('Erreur lors du chargement des images par club :', error);
      }
    );
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      (this.formImage as any)._file = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.formImage.imageUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  openAddModal() {
    this.editMode = false;
    const user = this.authService.getUtilisateurConnecte();
    this.formImage = { titre: '', imageUrl: '', description: '', clubId: user?.['clubId'] ?? null };
    this.modalTitle = 'Ajouter une photo';
    this.modalOpen = true;
  }

  openEditModal(image: Galerie) {
    this.editMode = true;
    this.formImage = { ...image };
    this.modalTitle = 'Modifier la photo';
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.formImage = {};
    if (this.imageFileInput) {
      this.imageFileInput.nativeElement.value = '';
    }
  }

  isSubmitting = false;

  submitImage() {
    const hasImage = !!(this.formImage.imageUrl || (this.formImage as any)._file);
    if (!this.formImage.titre || !hasImage || this.isSubmitting) return;
    this.isSubmitting = true;
    this.formImage.clubId = this.formImage.clubId ?? this.authService.getUtilisateurConnecte()?.['clubId'];
    const payload: any = {
      titre: this.formImage.titre,
      description: this.formImage.description,
      clubId: this.formImage.clubId,
      _file: (this.formImage as any)._file
    };
    if (this.editMode && this.formImage.id) {
      this.galerieService.update(this.formImage.id, this.formImage as any).subscribe({
        next: () => {
          this.toast.success('Photo modifiée avec succès.');
          this.loadImages(this.formImage.clubId as number);
          this.closeModal();
          this.isSubmitting = false;
        },
        error: () => {
          this.toast.error('Erreur lors de la modification de la photo.');
          this.isSubmitting = false;
        }
      });
    } else {
      this.galerieService.create(payload).subscribe({
        next: () => {
          this.toast.success('Photo ajoutée avec succès.');
          this.loadImages(this.formImage.clubId as number);
          this.closeModal();
          this.isSubmitting = false;
        },
        error: (err) => {
          console.error('[DEBUG][FRONT] Erreur backend:', err);
          this.toast.error('Erreur lors de l\'ajout de la photo.');
          this.isSubmitting = false;
        }
      });
    }
  }

  uploadImage(): void {
    this.errorMsg = null;
    if (this.newImage.titre && this.newImage.description && this.newImage.imageUrl) {
      this.galerieService.create(this.newImage as Galerie).subscribe(
        (res) => {
          // Recharger les images pour le club courant (priorité : newImage.clubId sinon clubId de l'utilisateur)
          const clubIdFromForm = (this.newImage as any).clubId ?? null;
          const userAfter = this.authService.getUtilisateurConnecte();
          const clubIdToLoad = clubIdFromForm ?? userAfter?.['clubId'] ?? null;
          if (clubIdToLoad) {
            this.loadImages(clubIdToLoad);
          } else {
            console.warn('[GestionGalerie] clubId introuvable après création — aucune recharge effectuée');
          }
          this.newImage = {};
          this.imageUrl = null;
          this.afficherFormulaire = false;
        },
        (error) => {
          console.error('Erreur lors de l\'ajout de l\'image :', error);
          this.errorMsg = "Erreur lors de l'ajout de l'image. Veuillez réessayer.";
        }
      );
    } else {
      this.errorMsg = 'Tous les champs sont requis pour ajouter une image.';
      console.warn('Tous les champs sont requis pour ajouter une image.');
    }
  }

  deleteImage(id: string | undefined): void {
    if (!id) {
      console.error('ID non défini, impossible de supprimer l\'image.');
      return;
    }
  
    this.galerieService.delete(id).subscribe({
      next: () => {
        this.toast.success('Photo supprimée.');
        const user = this.authService.getUtilisateurConnecte();
        const clubId = user?.['clubId'] ?? null;
        if (clubId) this.loadImages(clubId);
      },
      error: (error) => {
        console.error('Erreur lors de la suppression de l\'image :', error);
        this.toast.error('Erreur lors de la suppression de la photo.');
      }
    });
  }
  editImage(image: any): void {
    // Pré-remplir le formulaire avec les données de l'image à modifier
    this.newImage = { ...image };
    this.imageUrl = image.imageUrl;
  }

  // Gestion des actions du tableau réutilisable
  handleTableAction(event: { action: string; row: Galerie }) {
    if (event.action === 'edit') {
      this.openEditModal(event.row);
    } else if (event.action === 'delete') {
      if (confirm('Supprimer cette image ?')) {
        this.deleteImage(event.row.id);
      }
    }
  }
}