import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ClubService } from '../../../services/club.service';
import { AboutConfigService, AboutConfig } from '../../../services/about-config.service';

const DEFAULTS: Required<Omit<AboutConfig, 'clubId'>> = {
  headingLine1: 'Un club fondé sur',
  headingLine2: "l'excellence et le respect",
  leadText: ", fondé en 1995, accueille des pratiquants de tous niveaux dans un environnement de respect et de discipline.",
  descriptionText: "Notre mission est de former des athlètes sur le plan physique et mental, en mettant l'accent sur le développement personnel et la maîtrise de soi.",
  imagePath: '',
  foundedYear: '1995',
  badgeLabel: 'Fondé en',
  chips: ['Respect', 'Discipline', 'Excellence', "Esprit d'équipe"],
  missionTitle: 'Notre Mission',
  missionText: "Accompagner chaque pratiquant dans un environnement sûr et stimulant, pour progresser et s'épanouir à travers le Taekwondo.",
  visionTitle: 'Notre Vision',
  visionText: "Inspirer et transmettre les valeurs du Taekwondo, pour bâtir une communauté forte et ouverte à toutes les générations.",
  valuesTitle: 'Nos Valeurs',
  values: [
    { bold: 'Respect', description: 'chaque individu est valorisé' },
    { bold: 'Discipline', description: 'excellence par persévérance' },
    { bold: 'Maîtrise', description: 'aller plus loin chaque jour' }
  ]
};

@Component({
  selector: 'app-a-propos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './a-propos.component.html',
  styleUrl: './a-propos.component.css'
})
export class AProposComponent implements OnInit, OnDestroy {

  config: Required<Omit<AboutConfig, 'clubId'>> = { ...DEFAULTS };
  imageUrl = 'assets/images/image2.JPG';
  clubVille = '';
  private clubSub?: Subscription;

  constructor(
    private clubService: ClubService,
    private aboutConfigService: AboutConfigService
  ) {}

  ngOnInit(): void {
    this.clubSub = this.clubService.selectedClub$.subscribe(club => {
      const ville = this.clubService.getClubVilleLabel(club);
      if (ville) this.clubVille = ville;
    });

    // Ville + club depuis localStorage si dispo, sinon depuis l'API (visiteur non connecté)
    const selected = this.clubService.getSelectedClub();
    const selectedVille = this.clubService.getClubVilleLabel(selected);
    if (selectedVille) {
      this.clubVille = selectedVille;
    }

    if (selected?.id) {
      this.loadAboutConfig(selected.id);
    } else {
      this.clubService.getClubs().subscribe({
        next: (clubs) => {
          const club = clubs?.[0];
          const ville = this.clubService.getClubVilleLabel(club);
          if (ville) this.clubVille = ville;
          if (club?.id) this.loadAboutConfig(club.id);
        },
        error: () => {}
      });
    }
  }

  private loadAboutConfig(clubId: number): void {
    this.aboutConfigService.getConfig(clubId).subscribe({
      next: (c) => {
        this.config = {
          headingLine1: c.headingLine1 || DEFAULTS.headingLine1,
          headingLine2: c.headingLine2 || DEFAULTS.headingLine2,
          leadText: c.leadText || DEFAULTS.leadText,
          descriptionText: c.descriptionText || DEFAULTS.descriptionText,
          imagePath: c.imagePath || '',
          foundedYear: c.foundedYear || DEFAULTS.foundedYear,
          badgeLabel: c.badgeLabel || DEFAULTS.badgeLabel,
          chips: c.chips?.length ? c.chips : DEFAULTS.chips,
          missionTitle: c.missionTitle || DEFAULTS.missionTitle,
          missionText: c.missionText || DEFAULTS.missionText,
          visionTitle: c.visionTitle || DEFAULTS.visionTitle,
          visionText: c.visionText || DEFAULTS.visionText,
          valuesTitle: c.valuesTitle || DEFAULTS.valuesTitle,
          values: c.values?.length ? c.values : DEFAULTS.values
        };
        this.imageUrl = this.aboutConfigService.imageUrl(c.imagePath);
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.clubSub?.unsubscribe();
  }
}
