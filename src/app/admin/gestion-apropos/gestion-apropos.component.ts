import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AboutConfigService, AboutConfig } from '../../services/about-config.service';
import { AuthService, Utilisateur } from '../../services/auth.service';
import { ClubService, Club } from '../../services/club.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

type Tab = 'general' | 'image' | 'cartes';

@Component({
  selector: 'app-gestion-apropos',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, UiButtonComponent],
  templateUrl: './gestion-apropos.component.html',
  styleUrl: './gestion-apropos.component.css'
})
export class GestionAProposComponent implements OnInit {

  config: AboutConfig = {};
  imagePreviewUrl: string | null = null;
  loading = false;
  saving = false;
  uploadingImage = false;
  activeTab: Tab = 'general';

  // ADMIN : club fixe (son propre club). SUPER_ADMIN : doit choisir un club dans la liste.
  isClubLocked = false;
  clubs: Club[] = [];
  selectedClubId: number | null = null;
  selectedClubName = '';

  constructor(
    private aboutConfigService: AboutConfigService,
    private authService: AuthService,
    private clubService: ClubService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const utilisateur: Utilisateur | null = this.authService.getUtilisateurConnecte();
    const clubId = utilisateur?.['clubId'];
    // Un SUPER_ADMIN ne doit jamais être verrouillé sur un club, même si son compte
    // a un clubId renseigné (ex: comptes de seed) — seul le rôle fait foi ici.
    const role = (utilisateur?.['role'] ?? this.authService.getRole() ?? '').toString().toUpperCase();

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
      this.loadConfigForClub(clubId);
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
    if (clubId) this.loadConfigForClub(clubId);
  }

  private loadConfigForClub(clubId: number): void {
    this.loading = true;
    this.aboutConfigService.getConfig(clubId).subscribe({
      next: (c) => {
        this.config = {
          ...c,
          clubId,
          chips: c.chips?.length ? [...c.chips] : [],
          values: c.values?.length ? c.values.map(v => ({ ...v })) : []
        };
        this.imagePreviewUrl = this.aboutConfigService.imageUrl(c.imagePath);
        this.loading = false;
      },
      error: () => {
        this.toast.error('Impossible de charger la configuration À propos.');
        this.loading = false;
      }
    });
  }

  setTab(tab: Tab): void { this.activeTab = tab; }
  trackByIndex(i: number): number { return i; }

  // ── Chips ─────────────────────────────────────
  addChip(): void { this.config.chips = [...(this.config.chips ?? []), '']; }
  removeChip(i: number): void { this.config.chips = this.config.chips!.filter((_, j) => j !== i); }

  // ── Valeurs ───────────────────────────────────
  addValue(): void { this.config.values = [...(this.config.values ?? []), { bold: '', description: '' }]; }
  removeValue(i: number): void { this.config.values = this.config.values!.filter((_, j) => j !== i); }

  // ── Image ─────────────────────────────────────
  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.selectedClubId) {
      this.toast.error('Choisis un club avant de déposer une image.');
      return;
    }
    this.uploadingImage = true;
    this.aboutConfigService.uploadImage(file, this.selectedClubId).subscribe({
      next: (updated) => {
        this.config.imagePath = updated.imagePath;
        this.imagePreviewUrl = this.aboutConfigService.imageUrl(updated.imagePath);
        this.uploadingImage = false;
        this.toast.success('Image mise à jour.');
      },
      error: () => {
        this.uploadingImage = false;
        this.toast.error("Erreur lors de l'upload de l'image.");
      }
    });
  }

  // ── Sauvegarde ────────────────────────────────
  save(): void {
    if (!this.selectedClubId) {
      this.toast.error('Choisis un club avant d\'enregistrer.');
      return;
    }
    this.saving = true;
    const payload: AboutConfig = {
      ...this.config,
      clubId: this.selectedClubId,
      chips: (this.config.chips ?? []).filter(c => c.trim()),
      values: (this.config.values ?? []).filter(v => v.bold?.trim())
    };
    this.aboutConfigService.updateConfig(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(`Section À propos mise à jour pour ${this.selectedClubName || 'ce club'}.`);
      },
      error: () => {
        this.saving = false;
        this.toast.error('Erreur lors de la sauvegarde.');
      }
    });
  }
}
