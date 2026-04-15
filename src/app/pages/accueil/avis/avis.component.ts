import { UiFormComponent } from '../../../shared/ui/form/ui-form.component';
import { UiButtonComponent } from '../../../shared/ui/buttons/ui-button/ui-button.component';
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvisService, Avis } from '../../../services/avis.service';
import { ClubSelectionService } from '../../../services/club-selection.service';
import { ClubService } from '../../../services/club.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { AuthService } from '../../../services/auth.service';
import Swiper from 'swiper/bundle';

@Component({
  selector: 'app-avis',
  standalone: true,
  imports: [CommonModule, FormsModule, UiButtonComponent, UiFormComponent],
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.css'],
})
export class AvisComponent implements OnInit, AfterViewInit, OnDestroy {
  avis: Avis[] = [];
  error: string | null = null;
  fieldsAvis = [
    { name: 'pseudoVisiteur', label: 'Votre nom', type: 'text', placeholder: 'Entrez votre nom', required: true },
    { name: 'contenu', label: 'Votre témoignage', type: 'textarea', placeholder: 'Partagez votre expérience...', required: true },
    { name: 'note', label: 'Note', type: 'select', required: true, options: [
      { value: '', label: 'Choisir une note' },
      { value: 1, label: '1 étoile' },
      { value: 2, label: '2 étoiles' },
      { value: 3, label: '3 étoiles' },
      { value: 4, label: '4 étoiles' },
      { value: 5, label: '5 étoiles' }
    ] },
    { name: 'typeAvis', label: 'Sujet (optionnel)', type: 'select', required: false, options: [
      { value: '', label: 'Avis général' },
      { value: 'cours', label: 'Cours' },
      { value: 'entraineurs', label: 'Entraîneurs' },
      { value: 'evenements', label: 'Événements' },
      { value: 'organisation', label: 'Organisation' },
      { value: 'competitions', label: 'Compétitions' }
    ] },
    { name: 'photo', label: 'Photo (optionnelle)', type: 'file', required: false, onChange: (event: any) => this.onPhotoSelected(event) }
  ];
  loadingAvis = false;
  formError = '';

  onFormSubmit(data: any) {
    // Ici, tu peux ajouter la logique de validation et d'envoi
    // Ajout du clubId à la soumission
    data.clubId = this.clubSelectionService.getSelectedClubId();
    this.envoyerAvisForm(data);
  }

  envoyerAvisForm(data: any) {
    // Récupérer le clubId depuis plusieurs sources (service, clubService/localStorage)
    let clubId = this.clubSelectionService.getSelectedClubId() ?? this.clubService.getSelectedClub()?.id ?? null;
    if (clubId === null || clubId === undefined) {
      this.toast.warning("Veuillez sélectionner un club avant d'envoyer votre avis.");
      return;
    }

    // Construction du FormData pour l'envoi au backend
    // DEBUG: log des données reçues pour vérifier typeAvis
    console.debug('[Avis] données formulaire avant envoi:', data);
    const formData = new FormData();
    formData.append('pseudoVisiteur', data.pseudoVisiteur || '');
    formData.append('contenu', data.contenu || '');
    formData.append('note', String(data.note || 5));
    // N'ajoute typeAvis que s'il est renseigné
    const typeAvisValue = (data.typeAvis === undefined || data.typeAvis === null || data.typeAvis === '') ? null : String(data.typeAvis);
    if (typeAvisValue !== null) {
      formData.append('typeAvis', typeAvisValue);
    }
    // Ajout du clubId
    formData.append('clubId', String(clubId));

    if (data.photo instanceof File) {
      formData.append('photo', data.photo);
    }

    // Ajout utilisateurId si connecté
    const utilisateur = this.authService.getUtilisateurConnecte();
    if (utilisateur && utilisateur.id) {
      formData.append('utilisateurId', String(utilisateur.id));
    }

    // DEBUG: log FormData entries
    try {
      for (const pair of (formData as any).entries()) {
        console.debug('[Avis] formData', pair[0], pair[1]);
      }
    } catch (e) {
      // certains navigateurs/stack ne permettent pas l'itération, ignorer
    }

    this.avisService.ajouterAvis(formData).subscribe({
      next: () => {
        this.toast.success('Merci, votre avis a bien été envoyé !', 4000);
        this.modaleOuverte = false;
        this.messageConfirmation = 'Merci ! Votre avis sera publié après validation.';
      },
      error: (err) => {
        this.toast.error("Erreur lors de l'envoi de l'avis.");
        console.error(err);
      }
    });
  }
  avisApprouves: Avis[] = [];
  modaleOuverte = false;
  messageConfirmation: string | null = null;
  swiper: Swiper | null = null;

  // ✅ typeAvis optionnel (aucune valeur par défaut)
  nouvelAvis: Partial<Avis> = { contenu: '', pseudoVisiteur: '', note: 5, typeAvis: '' };
  photoPreview: string | null = null;
  photoFichier: File | null = null;

  // Liste blanche des sujets autorisés
  private readonly allowedTypes = ['cours', 'entraineurs', 'evenements', 'organisation', 'competitions'] as const;

  private clubIdSubscription: any;
  constructor(
    private avisService: AvisService,
    private toast: ToastService,
    private clubSelectionService: ClubSelectionService,
    private clubService: ClubService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.clubIdSubscription = this.clubSelectionService.selectedClubId$.subscribe(clubId => {
      if (clubId) {
        this.chargerAvisClub(clubId);
      }
    });
  }
  ngAfterViewInit(): void {}
  ngOnDestroy(): void {
    if (this.swiper) { this.swiper.destroy(true, true); this.swiper = null; }
    if (this.clubIdSubscription) { this.clubIdSubscription.unsubscribe(); }
  }

  private initOrUpdateSwiper(): void {
    if (this.swiper) { this.swiper.update(); return; }
    this.swiper = new Swiper('.avis-swiper', {
      loop: true, spaceBetween: 30, slidesPerView: 1,
      autoplay: { delay: 5000 },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      breakpoints: { 768: { slidesPerView: 2 } },
    });
  }

  /** Charge TOUS les avis du club sélectionné (approuvés ou non) pour debug */
  chargerAvisClub(clubId: number): void {
    // On ne filtre plus sur approuve pour debug
    this.avisService.getAvisParClub(clubId).subscribe({
      next: (avis: Avis[]) => {
        this.avisApprouves = avis || [];
        console.log('[Avis] chargés (TOUS) depuis API, count =', this.avisApprouves.length, 'pour clubId=', clubId);
        console.log('[Avis] payload complet:', this.avisApprouves);
        this.initOrUpdateSwiper();
      },
      error: (err: any) => {
        console.error('Erreur de chargement des avis du club :', err);
      }
    });
  }

  trackByAvisId = (_: number, a: { id?: string | number }) => a?.id ?? _;

  ouvrirModale(): void { this.modaleOuverte = true; }
  fermerModale(): void { this.modaleOuverte = false; }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) { 
      this.toast.warning('Veuillez sélectionner un fichier image.'); 
      return; 
    }
    if (file.size > 3_000_000) { 
      this.toast.warning('Image trop volumineuse (maximum 3 Mo).'); 
      return; 
    }

    this.photoFichier = file;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => { this.photoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  envoyerAvis(): void {
    if (!this.nouvelAvis.contenu?.trim() || !this.nouvelAvis.pseudoVisiteur?.trim()) {
      this.toast.warning('Veuillez renseigner le contenu et votre nom/pseudo.');
      return;
    }

    const noteNum = Math.max(1, Math.min(5, +(this.nouvelAvis.note ?? 5)));
    const formData = new FormData();
    formData.append('contenu', (this.nouvelAvis.contenu ?? '').trim());
    formData.append('pseudoVisiteur', (this.nouvelAvis.pseudoVisiteur ?? '').trim());
    formData.append('note', String(noteNum));

    // ✅ N’envoie typeAvis que s’il est choisi et validé
    const type = this.sanitizeTypeAvis(this.nouvelAvis.typeAvis);
    if (type) formData.append('typeAvis', type);

    if (this.photoFichier) formData.append('photo', this.photoFichier);

    this.avisService.ajouterAvis(formData).subscribe({
      next: () => {
        this.toast.success('Votre avis a été envoyé avec succès');
        this.messageConfirmation = 'Merci ! Votre avis sera publié après validation par notre équipe.';
        this.fermerModale();

        // ✅ Reset sans valeur par défaut pour typeAvis
        this.nouvelAvis = { contenu: '', pseudoVisiteur: '', note: 5, typeAvis: '' };
        this.photoPreview = null; 
        this.photoFichier = null;

        const clubId = this.clubSelectionService.getSelectedClubId();
        if (clubId) {
          this.chargerAvisClub(clubId);
        }
        setTimeout(() => this.messageConfirmation = null, 5000);
      },
      error: () => this.toast.error('Une erreur est survenue lors de l’envoi. Veuillez réessayer plus tard.')
    });
  }

  private sanitizeTypeAvis(s?: string): string {
    const k = (s ?? '').toLowerCase().trim();
    return this.allowedTypes.includes(k as any) ? k : '';
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  getPhotoUrl(photo: string): string {
    return `/api/uploads/avis/${encodeURIComponent(photo)}`;
  }  
}
