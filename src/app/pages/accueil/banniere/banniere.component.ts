import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ClubService, Club } from '../../../services/club.service';
import { HeroConfigService, HeroConfig } from '../../../services/hero-config.service';

const DEFAULTS: Required<Pick<HeroConfig, 'eyebrowText' | 'identityStrong' | 'identityMid' | 'slogans' | 'stats'>> = {
  eyebrowText: 'Club de Taekwondo · Lyon',
  identityStrong: 'Olympique',
  identityMid: 'Taekwondo',
  slogans: ['Discipline', 'Respect', 'Dépassement de soi', 'Esprit d\'équipe', 'Performance', 'Confiance'],
  stats: [
    { value: '30+', label: 'ans d\'expérience' },
    { value: '200+', label: 'membres actifs' },
    { value: '50+', label: 'médailles' },
    { icon: 'ri-shield-star-line', label: 'Club FFT affilié' }
  ]
};

@Component({
  selector: 'app-banniere',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './banniere.component.html',
  styleUrl: './banniere.component.css'
})
export class BanniereComponent implements OnInit, OnDestroy {

  config: HeroConfig = { ...DEFAULTS };
  videoUrl = 'assets/videos/hero-optimise.mp4';
  private hasVideoFallback = false;
  currentSlogan = DEFAULTS.slogans[0];
  private sloganIndex = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private clubService: ClubService,
    private heroConfigService: HeroConfigService
  ) {}

  ngOnInit(): void {
    this.heroConfigService.getConfig().subscribe({
      next: (c) => {
        this.config = {
          eyebrowText: c.eyebrowText || DEFAULTS.eyebrowText,
          identityStrong: c.identityStrong || DEFAULTS.identityStrong,
          identityMid: c.identityMid || DEFAULTS.identityMid,
          slogans: c.slogans?.length ? c.slogans : DEFAULTS.slogans,
          stats: c.stats?.length ? c.stats : DEFAULTS.stats,
          videoPath: c.videoPath
        };
        this.hasVideoFallback = false;
        this.videoUrl = this.heroConfigService.videoUrl(c.videoPath);
        this.currentSlogan = this.config.slogans![0];
        this.startRotation();
      },
      error: () => {
        this.startRotation();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  get selectedClub(): Club | null {
    return this.clubService.getSelectedClub();
  }

  onVideoError(): void {
    if (this.hasVideoFallback) return;
    this.hasVideoFallback = true;
    this.videoUrl = 'assets/videos/hero-optimise.mp4';
  }

  private startRotation(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    const slogans = this.config.slogans ?? DEFAULTS.slogans;
    this.sloganIndex = 0;
    this.currentSlogan = slogans[0];
    this.intervalId = setInterval(() => {
      this.sloganIndex = (this.sloganIndex + 1) % slogans.length;
      this.currentSlogan = slogans[this.sloganIndex];
    }, 2500);
  }
}
