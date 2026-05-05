import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { GestionAProposComponent } from '../gestion-apropos/gestion-apropos.component';
import { GestionHeroComponent } from '../gestion-hero/gestion-hero.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

type AccueilTab = 'banniere' | 'apropos';

@Component({
  selector: 'app-gestion-accueil-site',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, UiButtonComponent, GestionHeroComponent, GestionAProposComponent],
  templateUrl: './gestion-accueil-site.component.html',
  styleUrl: './gestion-accueil-site.component.css'
})
export class GestionAccueilSiteComponent {
  @ViewChild(GestionHeroComponent) heroEditor?: GestionHeroComponent;
  @ViewChild(GestionAProposComponent) aproposEditor?: GestionAProposComponent;

  activeTab: AccueilTab = 'banniere';

  setTab(tab: AccueilTab): void {
    this.activeTab = tab;
  }

  get sectionTitle(): string {
    return this.activeTab === 'banniere' ? 'Bannière principale' : 'À propos';
  }

  get sectionIcon(): string {
    return this.activeTab === 'banniere' ? 'ri-layout-top-line' : 'ri-information-line';
  }

  get sectionDescription(): string {
    return this.activeTab === 'banniere'
      ? "Vidéo, textes, slogans et chiffres clés affichés sur la page d'accueil."
      : 'Textes, image et cartes Mission / Vision / Valeurs de la section À propos.';
  }

  get activeLoading(): boolean {
    return this.activeTab === 'banniere'
      ? this.heroEditor?.loading ?? true
      : this.aproposEditor?.loading ?? true;
  }

  get activeSaving(): boolean {
    return this.activeTab === 'banniere'
      ? this.heroEditor?.saving ?? false
      : this.aproposEditor?.saving ?? false;
  }

  saveActive(): void {
    if (this.activeTab === 'banniere') {
      this.heroEditor?.save();
      return;
    }

    this.aproposEditor?.save();
  }
}
