import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroConfigService, HeroConfig } from '../../services/hero-config.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

type Tab = 'identite' | 'slogans' | 'stats';

export const AVAILABLE_ICONS = [
  { icon: 'ri-shield-star-line',      label: 'Bouclier étoile' },
  { icon: 'ri-trophy-line',           label: 'Trophée' },
  { icon: 'ri-medal-line',            label: 'Médaille' },
  { icon: 'ri-award-line',            label: 'Récompense' },
  { icon: 'ri-star-line',             label: 'Étoile' },
  { icon: 'ri-team-line',             label: 'Équipe' },
  { icon: 'ri-user-star-line',        label: 'Athlète' },
  { icon: 'ri-heart-line',            label: 'Cœur' },
  { icon: 'ri-fire-line',             label: 'Feu' },
  { icon: 'ri-focus-3-line',          label: 'Focus' },
  { icon: 'ri-flag-line',             label: 'Drapeau' },
  { icon: 'ri-run-line',              label: 'Course' },
  { icon: 'ri-timer-line',            label: 'Chrono' },
  { icon: 'ri-calendar-check-line',   label: 'Calendrier' },
  { icon: 'ri-checkbox-circle-line',  label: 'Validé' },
  { icon: 'ri-building-line',         label: 'Bâtiment' },
  { icon: 'ri-map-pin-line',          label: 'Lieu' },
  { icon: 'ri-group-line',            label: 'Groupe' },
  { icon: 'ri-thumb-up-line',         label: 'Pouce' },
  { icon: 'ri-shield-check-line',     label: 'Bouclier validé' },
];

@Component({
  selector: 'app-gestion-hero',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, UiButtonComponent],
  templateUrl: './gestion-hero.component.html',
  styleUrl: './gestion-hero.component.css'
})
export class GestionHeroComponent implements OnInit {

  config: HeroConfig = {};
  loading = true;
  saving = false;
  uploadingVideo = false;
  videoPreviewUrl: string | null = null;
  activeTab: Tab = 'identite';
  iconPickerOpenIndex: number | null = null;
  availableIcons = AVAILABLE_ICONS;

  constructor(
    private heroConfigService: HeroConfigService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.heroConfigService.getConfig().subscribe({
      next: (c) => {
        this.config = {
          ...c,
          slogans: c.slogans?.length ? [...c.slogans] : [],
          stats: c.stats?.length ? c.stats.map(s => ({ ...s })) : []
        };
        this.videoPreviewUrl = this.heroConfigService.videoUrl(c.videoPath);
        this.loading = false;
      },
      error: () => {
        this.toast.error('Impossible de charger la configuration du hero.');
        this.loading = false;
      }
    });
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.iconPickerOpenIndex = null;
  }

  // ── Slogans ──────────────────────────────────
  addSlogan(): void { this.config.slogans = [...(this.config.slogans ?? []), '']; }
  removeSlogan(i: number): void { this.config.slogans = this.config.slogans!.filter((_, j) => j !== i); }
  trackByIndex(i: number): number { return i; }

  // ── Stats ─────────────────────────────────────
  addStat(): void { this.config.stats = [...(this.config.stats ?? []), { label: '' }]; }
  removeStat(i: number): void {
    this.config.stats = this.config.stats!.filter((_, j) => j !== i);
    if (this.iconPickerOpenIndex === i) this.iconPickerOpenIndex = null;
  }

  toggleIconPicker(i: number): void {
    this.iconPickerOpenIndex = this.iconPickerOpenIndex === i ? null : i;
  }

  selectIcon(i: number, icon: string): void {
    this.config.stats![i] = { ...this.config.stats![i], icon, value: undefined };
    this.iconPickerOpenIndex = null;
  }

  clearIcon(i: number): void {
    this.config.stats![i] = { ...this.config.stats![i], icon: undefined };
  }

  iconLabel(icon: string): string {
    return this.availableIcons.find(x => x.icon === icon)?.label ?? icon;
  }

  // ── Vidéo ─────────────────────────────────────
  onVideoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingVideo = true;
    this.heroConfigService.uploadVideo(file).subscribe({
      next: (updated) => {
        this.config.videoPath = updated.videoPath;
        this.videoPreviewUrl = this.heroConfigService.videoUrl(updated.videoPath);
        this.uploadingVideo = false;
        this.toast.success('Vidéo mise à jour.');
      },
      error: () => {
        this.uploadingVideo = false;
        this.toast.error("Erreur lors de l'upload de la vidéo.");
      }
    });
  }

  // ── Sauvegarde ────────────────────────────────
  save(): void {
    this.saving = true;
    const payload: HeroConfig = {
      ...this.config,
      slogans: (this.config.slogans ?? []).filter(s => s.trim()),
      stats: (this.config.stats ?? []).filter(s => s.label?.trim())
    };
    this.heroConfigService.updateConfig(payload).subscribe({
      next: () => { this.saving = false; this.toast.success('Bannière mise à jour avec succès.'); },
      error: () => { this.saving = false; this.toast.error('Erreur lors de la sauvegarde.'); }
    });
  }
}
