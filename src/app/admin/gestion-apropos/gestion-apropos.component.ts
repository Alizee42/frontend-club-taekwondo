import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AboutConfigService, AboutConfig } from '../../services/about-config.service';
import { ClubService } from '../../services/club.service';
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
export class GestionAProposComponent implements OnInit, OnDestroy {

  config: AboutConfig = {};
  imagePreviewUrl: string | null = null;
  loading = true;
  saving = false;
  uploadingImage = false;
  activeTab: Tab = 'general';

  clubVille = '';
  private clubSub?: Subscription;

  constructor(
    private aboutConfigService: AboutConfigService,
    private clubService: ClubService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.clubSub = this.clubService.selectedClub$.subscribe(club => {
      const ville = this.clubService.getClubVilleLabel(club);
      if (ville) this.clubVille = ville;
    });

    const selected = this.clubService.getSelectedClub();
    const selectedVille = this.clubService.getClubVilleLabel(selected);
    if (selectedVille) {
      this.clubVille = selectedVille;
    } else {
      this.clubService.getClubs().subscribe({
        next: (clubs) => {
          const ville = this.clubService.getClubVilleLabel(clubs?.[0]);
          if (ville) this.clubVille = ville;
        },
        error: () => {}
      });
    }

    this.aboutConfigService.getConfig().subscribe({
      next: (c) => {
        this.config = {
          ...c,
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
  ngOnDestroy(): void { this.clubSub?.unsubscribe(); }
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
    this.uploadingImage = true;
    this.aboutConfigService.uploadImage(file).subscribe({
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
    this.saving = true;
    const payload: AboutConfig = {
      ...this.config,
      chips: (this.config.chips ?? []).filter(c => c.trim()),
      values: (this.config.values ?? []).filter(v => v.bold?.trim())
    };
    this.aboutConfigService.updateConfig(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Section À propos mise à jour.');
      },
      error: () => {
        this.saving = false;
        this.toast.error('Erreur lors de la sauvegarde.');
      }
    });
  }
}
