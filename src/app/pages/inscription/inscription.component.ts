import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  ValidatorFn,
  AbstractControl
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ClubService } from '../../services/club.service';
import { ToastService } from '../../shared/toast/toast.service';
import { environment } from '../../../environments/environment';

interface MembrePayload {
  nom: string;
  prenom: string;
  dateNaissance: string;
  ceinture?: string;
  numeroLicence?: string;
  utilisateurId?: number;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css']
})
export class InscriptionComponent implements OnInit {
  utilisateurForm!: FormGroup;
  membresForm!: FormGroup;
  step = 1;
  showConfirmationModal = false;
  erreurMessage = '';
  loading = false;

  togglePasswordVisibility = false;
  toggleConfirmPasswordVisibility = false;
  today: string = new Date().toISOString().split('T')[0];

  ceinturesDisponibles = ['Blanche', 'Jaune', 'Orange', 'Verte', 'Bleue', 'Marron', 'Noire'];
  roleMembreSeul: boolean = false;
  // clubs loaded from API for selection
  clubs: any[] = [];
  // club currently selected in header (if any)
  selectedClub: any = null;
  // email utilisé pour l'inscription (affiché dans la modale de confirmation)
  lastRegisteredEmail: string | null = null;

  constructor(private fb: FormBuilder,
              private http: HttpClient,
              private toastService: ToastService,
              private clubService: ClubService) {}

  ngOnInit(): void {
    this.utilisateurForm = this.fb.group(
      {
        // Identité / contact
        nom: ['', [Validators.required, Validators.minLength(2)]],
        prenom: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        telephone: ['', [
          Validators.required,
          Validators.pattern(/^\s*(?:\+?\d{1,3}[\s.-]?)?(?:0|\(0\))?\d(?:[\s.-]?\d){8}\s*$/)
        ]],

        // Auth
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],

        // Profil
        dateNaissance: ['', Validators.required],
        role: ['', Validators.required],

        // Adresse
        adresse: [''], // string recomposée avant POST
        adresseLigne1: ['', [Validators.required, Validators.minLength(3)]],
        adresseLigne2: [''],
        codePostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
        ville: ['', [Validators.required, Validators.minLength(2)]],
        pays: ['France', [Validators.required]]
      },
      { validators: this.matchPasswords }
    );

    // add clubId control (optional) - will be shown when role is MEMBRE or PARENT
    this.utilisateurForm.addControl('clubId', this.fb.control(null));

    this.membresForm = this.fb.group({
      membres: this.fb.array([])
    });

    // Normalisation très légère : réduire seulement les espaces consécutifs (>1) mais conserver un espace en cours de frappe
    this.utilisateurForm.get('ville')?.valueChanges.subscribe(v => {
      if (typeof v === 'string') {
        // Ne pas toucher si l'utilisateur est en train de taper deux espaces pour en insérer un
        const cleaned = v.replace(/ {2,}/g, ' '); // remplace 2+ espaces par 1
        if (cleaned !== v) {
          this.utilisateurForm.get('ville')?.setValue(cleaned, { emitEvent: false });
        }
      }
    });

    // restauration locale
    const savedForm = localStorage.getItem('inscriptionData');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        if (data?.utilisateur) this.utilisateurForm.patchValue(data.utilisateur);
        if (Array.isArray(data?.membres)) data.membres.forEach((m: any) => this.addMembre(m));
      } catch (e) {
        console.error('Erreur parse localStorage inscriptionData', e);
      }
    }

    this.utilisateurForm.valueChanges.subscribe(() => this.saveLocal());
    this.membresForm.valueChanges.subscribe(() => this.saveLocal());

    // load clubs for selection
    this.loadClubs();

    // pick up the club currently selected in the header (stored in ClubService / localStorage)
    this.selectedClub = this.clubService.getSelectedClub();
    if (this.selectedClub && this.selectedClub.id) {
      this.utilisateurForm.get('clubId')?.setValue(this.selectedClub.id);
    }

    // update when header selection changes
    this.clubService.selectedClub$.subscribe(c => {
      this.selectedClub = c;
      if (c && c.id) this.utilisateurForm.get('clubId')?.setValue(c.id);
    });
  }

  // ===== Clubs =====
  loadClubs(): void {
    this.http.get(`${environment.apiUrl}/clubs`).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) this.clubs = res;
      },
      error: () => {
        // ignore silently for now
        this.clubs = [];
      }
    });
  }

  getSelectedClubName(): string | null {
    // prefer header-selected club when present
    if (this.selectedClub && (this.selectedClub.name || this.selectedClub.nom)) {
      return this.selectedClub.name || this.selectedClub.nom;
    }
    const id = this.utilisateurForm.get('clubId')?.value;
    if (!id) return null;
    const c = this.clubs.find(x => String(x.id) === String(id));
    return c ? c.name || c.nom || null : null;
  }

  // ===== Validators =====
  matchPasswords: ValidatorFn = (group: AbstractControl): { [key: string]: boolean } | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  };

  // ===== Membres =====
  get membres(): FormArray {
    return this.membresForm.get('membres') as FormArray;
  }

  addMembre(values?: any): void {
    const membre = this.fb.group({
      nom: [values?.nom || '', Validators.required],
      prenom: [values?.prenom || '', Validators.required],
      dateNaissance: [values?.dateNaissance || '', Validators.required],
      ceinture: [values?.ceinture ?? ''],
      numeroLicence: [values?.numeroLicence ?? '']
    });
    this.membres.push(membre);
  }

  removeMembre(index: number): void {
    this.membres.removeAt(index);
    this.saveLocal();
  }

  // ===== Rôle / Étapes =====
  onRoleChange(): void {
    const role = this.utilisateurForm.get('role')?.value;
    this.roleMembreSeul = role === 'MEMBRE';
    if (this.roleMembreSeul) {
      while (this.membres.length) this.membres.removeAt(0);
      this.step = 1;
    }
  }

  nextStep(): void {
    if (this.step === 1) {
      if (this.utilisateurForm.invalid) {
        this.utilisateurForm.markAllAsTouched();
        return;
      }
      this.step = this.roleMembreSeul ? 3 : 2;
      return;
    }
    if (this.step === 2) {
      if (this.membresForm.invalid || this.membres.length === 0) {
        this.erreurMessage = this.membres.length === 0 ? 'Ajoutez au moins un membre.' : 'Vérifiez les champs des membres.';
        this.membresForm.markAllAsTouched();
        return;
      }
      this.step = 3;
    }
  }

  previousStep(): void {
    if (this.step === 3) {
      this.step = this.roleMembreSeul ? 1 : 2;
    } else if (this.step > 1) {
      this.step--;
    }
  }

  // ===== UI helpers =====
  closeModal(): void { this.showConfirmationModal = false; }
  togglePassword(): void { this.togglePasswordVisibility = !this.togglePasswordVisibility; }
  toggleConfirmPassword(): void { this.toggleConfirmPasswordVisibility = !this.toggleConfirmPasswordVisibility; }
  isInvalid(field: string): boolean {
    const control = this.utilisateurForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  redirectToLogin(): void {
    // pré-remplir l'email si disponible
    const email = this.lastRegisteredEmail ? `?email=${encodeURIComponent(this.lastRegisteredEmail)}` : '';
    window.location.href = `/connexion${email}`;
  }

  goToSite(): void {
    // redirige vers la page d'accueil du frontend
    window.location.href = '/';
  }

  // ===== Local draft (sans mdp) =====
  saveLocal(): void {
    const { password, confirmPassword, ...safeUser } = this.utilisateurForm.value || {};
    try {
      localStorage.setItem('inscriptionData', JSON.stringify({
        utilisateur: safeUser,
        membres: this.membresForm.value.membres
      }));
    } catch {}
  }
  clearLocal(): void { localStorage.removeItem('inscriptionData'); }

  // ===== Helpers de formatage =====
  private capitalizeVille(v: string): string {
    const trimmed = v.trim();
    if (!trimmed) return '';
    // Autoriser lettres, espaces, apostrophes, tirets, accents
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map(part => part.charAt(0).toLocaleUpperCase('fr-FR') + part.slice(1))
      .join(' ')
      .replace(/\b(\w)'(\w)/g, (_m, a, b) => a + "'" + b); // conserver apostrophes
  }

  // ===== Nettoyage payload membre =====
  private cleanMembre(m: any, utilisateurId: number): MembrePayload {
    const obj: MembrePayload = {
      nom: (m.nom || '').trim(),
      prenom: (m.prenom || '').trim(),
      dateNaissance: m.dateNaissance,
      utilisateurId
    };
    const num = (m.numeroLicence || '').trim();
    const cei = (m.ceinture || '').trim();
    if (num) obj.numeroLicence = num;
    if (cei) obj.ceinture = cei;
    return obj;
  }

  // ===== Soumission =====
  onSubmit(): void {
    this.erreurMessage = '';
    if (this.utilisateurForm.invalid || this.utilisateurForm.errors?.['passwordMismatch']) {
      this.utilisateurForm.markAllAsTouched();
      this.erreurMessage = 'Formulaire invalide ou mots de passe non identiques.';
      return;
    }

    this.loading = true;

    const f = this.utilisateurForm.value;
    const villeNormalisee = this.capitalizeVille(String(f.ville || ''));
    const adresseComposee =
      `${f.adresseLigne1}` +
      (f.adresseLigne2 ? `, ${String(f.adresseLigne2).trim()}` : '') +
      `, ${f.codePostal} ${villeNormalisee}` +
      `, ${f.pays}`;

    const utilisateurData = {
      nom: String(f.nom || '').trim(),
      prenom: String(f.prenom || '').trim(),
      email: String(f.email || '').trim(),
      telephone: String(f.telephone || '').trim(),
      adresse: adresseComposee,
      dateNaissance: f.dateNaissance,
      role: String(f.role || '').toUpperCase(),
      clubId: f.clubId || null,
      password: f.password
    };

    this.http.post(`${environment.apiUrl}/utilisateurs/register`, utilisateurData).subscribe({
      next: (utilisateur: any) => {
        const utilisateurId = utilisateur?.id;
        if (!utilisateurId) {
          this.erreurMessage = "Réponse inattendue du serveur.";
          this.loading = false;
          return;
        }

        // conserver l'email renvoyé (ou celui du formulaire) pour affichage dans la modale
        this.lastRegisteredEmail = utilisateur?.email || utilisateurData.email;

        if (this.roleMembreSeul) {
          // créer membre adulte
          const membreSeul = this.cleanMembre({
            nom: utilisateurData.nom,
            prenom: utilisateurData.prenom,
            dateNaissance: utilisateurData.dateNaissance
          }, utilisateurId);

          // s'assurer que le DTO indique qu'il s'agit bien d'un adulte
          // (sinon le backend le considèrera comme enfant et rattachera un parent)
          (membreSeul as any).estAdulte = true;
          // rattacher le club si présent
          if (utilisateurData.clubId) (membreSeul as any).clubId = utilisateurData.clubId;

          this.http.post(`${environment.apiUrl}/membres`, membreSeul).subscribe({
            next: (membre: any) => {
              if (membre?.id) localStorage.setItem('membreId', String(membre.id));
              this.finaliser();
            },
            error: () => {
              this.toastService.error('❌ Erreur lors de l\'ajout du membre');
              this.loading = false;
            }
          });
          return;
        }

        // parent → créer les membres
        const membres: MembrePayload[] = (this.membresForm.value.membres || [])
          .map((m: any) => this.cleanMembre(m, utilisateurId));

        // pour les inscriptions faites par un parent, ces membres sont des enfants (estAdulte=false)
        for (const m of membres) {
          (m as any).estAdulte = false;
          if (utilisateurData.clubId) (m as any).clubId = utilisateurData.clubId;
        }

        if (!membres.length) { this.finaliser(); return; }

        let count = 0;
        let erreurs = 0;

        for (const membre of membres) {
          this.http.post(`${environment.apiUrl}/membres`, membre).subscribe({
            next: () => {
              count++;
              if (count + erreurs === membres.length && erreurs === 0) this.finaliser();
              if (count + erreurs === membres.length) this.loading = false;
            },
            error: (err) => {
              erreurs++;
              if (err.status === 409 || (err.status === 400 && err.error?.message?.includes('licence'))) {
                this.toastService.error(`⚠️ Numéro de licence ${membre.numeroLicence ?? ''} déjà utilisé`);
              } else {
                this.toastService.error('❌ Erreur lors de l\'ajout des membres');
              }
              if (count + erreurs === membres.length) this.loading = false;
            }
          });
        }
      },
      error: () => {
        this.loading = false;
        this.toastService.error('❌ Erreur lors de l\'inscription');
      }
    });
  }

  finaliser(): void {
    this.loading = false;
    this.clearLocal();
    this.step = 3;
    this.toastService.success('🥋 Inscription réussie ! Bienvenue dans notre dojo !');
    this.showConfirmationModal = true;
  }

  // ===== UI computed =====
  get progressPercent(): number {
    if (this.roleMembreSeul) {
      return this.step === 1 ? 0 : 100;
    } else {
      return Math.round(((this.step - 1) / 2) * 100);
    }
  }

  get passwordValue(): string {
    return (this.utilisateurForm.get('password')?.value || '') as string;
  }

  get passwordStrength(): number {
    const v = this.passwordValue;
    if (!v) return 0;
    let s = 0;
    if (v.length >= 6) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s;
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    return ['Très faible', 'Faible', 'Correct', 'Bon', 'Fort'][s] || 'Très faible';
  }

  get passwordStrengthColor(): string {
    switch (this.passwordStrength) {
      case 1: return '#e74c3c';
      case 2: return '#f39c12';
      case 3: return '#f1c40f';
      case 4: return '#2ecc71';
      default: return '#e0e0e0';
    }
  }
}
