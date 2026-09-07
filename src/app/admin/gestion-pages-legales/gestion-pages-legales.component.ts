import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MentionsLegalesConfigService, MentionsLegalesConfig } from '../../services/mentions-legales-config.service';
import { PolitiqueConfidentialiteConfigService, PolitiqueConfidentialiteConfig } from '../../services/politique-confidentialite-config.service';
import { AuthService, Utilisateur } from '../../services/auth.service';
import { ClubService, Club } from '../../services/club.service';
import { AdminClubSelectionService } from '../../services/admin-club-selection.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';

type Tab = 'mentions' | 'confidentialite';

@Component({
  selector: 'app-gestion-pages-legales',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, UiButtonComponent],
  templateUrl: './gestion-pages-legales.component.html',
  styleUrl: './gestion-pages-legales.component.css'
})
export class GestionPagesLegalesComponent implements OnInit, OnDestroy {

  activeTab: Tab = 'mentions';

  mentionsLegales: MentionsLegalesConfig = {};
  politiqueConfidentialite: PolitiqueConfidentialiteConfig = {};
  loading = false;
  saving = false;

  // ADMIN : club fixe (son propre club). SUPER_ADMIN : suit le sélecteur global du header.
  isClubLocked = false;
  selectedClubId: number | null = null;
  selectedClubName = '';
  private clubSelectionSub?: Subscription;

  constructor(
    private mentionsLegalesConfigService: MentionsLegalesConfigService,
    private politiqueConfidentialiteConfigService: PolitiqueConfidentialiteConfigService,
    private authService: AuthService,
    private clubService: ClubService,
    private adminClubSelection: AdminClubSelectionService,
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
      this.loadConfigsForClub(clubId);
      return;
    }

    // SUPER_ADMIN : suit le sélecteur de club global du header.
    this.clubSelectionSub = this.adminClubSelection.selectedClubId$.subscribe(id => {
      if (id === 'all' || id === null) {
        this.selectedClubId = null;
        this.mentionsLegales = {};
        this.politiqueConfidentialite = {};
      } else {
        this.selectedClubId = id;
        this.loadConfigsForClub(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.clubSelectionSub?.unsubscribe();
  }

  setTab(tab: Tab): void { this.activeTab = tab; }

  private loadConfigsForClub(clubId: number): void {
    this.loading = true;
    let pending = 2;
    const done = () => { pending--; if (pending === 0) this.loading = false; };

    this.mentionsLegalesConfigService.getConfig(clubId).subscribe({
      next: (c) => { this.mentionsLegales = { ...c, clubId }; done(); },
      error: () => { this.toast.error('Impossible de charger les mentions légales.'); done(); }
    });

    this.politiqueConfidentialiteConfigService.getConfig(clubId).subscribe({
      next: (c) => { this.politiqueConfidentialite = { ...c, clubId }; done(); },
      error: () => { this.toast.error('Impossible de charger la politique de confidentialité.'); done(); }
    });
  }

  save(): void {
    if (!this.selectedClubId) {
      this.toast.error('Choisis un club avant d\'enregistrer.');
      return;
    }
    this.saving = true;
    let pending = 2;
    let hadError = false;
    const done = () => {
      pending--;
      if (pending === 0) {
        this.saving = false;
        if (!hadError) {
          this.toast.success(`Pages légales mises à jour pour ${this.selectedClubName || 'ce club'}.`);
        }
      }
    };

    const mentionsPayload: MentionsLegalesConfig = { ...this.mentionsLegales, clubId: this.selectedClubId };
    this.mentionsLegalesConfigService.updateConfig(mentionsPayload).subscribe({
      next: () => done(),
      error: () => { hadError = true; this.toast.error('Erreur lors de la sauvegarde des mentions légales.'); done(); }
    });

    const confidentialitePayload: PolitiqueConfidentialiteConfig = { ...this.politiqueConfidentialite, clubId: this.selectedClubId };
    this.politiqueConfidentialiteConfigService.updateConfig(confidentialitePayload).subscribe({
      next: () => done(),
      error: () => { hadError = true; this.toast.error('Erreur lors de la sauvegarde de la politique de confidentialité.'); done(); }
    });
  }
}
