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

  constructor(private fb: FormBuilder, private http: HttpClient) {}

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

    this.membresForm = this.fb.group({
      membres: this.fb.array([])
    });

    // uppercase ville
    this.utilisateurForm.get('ville')?.valueChanges.subscribe(v => {
      if (typeof v === 'string') {
        const up = v.replace(/\s+/g, ' ').trim().toUpperCase();
        if (up !== v) this.utilisateurForm.get('ville')?.setValue(up, { emitEvent: false });
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
  redirectToLogin(): void { window.location.href = '/connexion'; }

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
    const adresseComposee =
      `${f.adresseLigne1}` +
      (f.adresseLigne2 ? `, ${String(f.adresseLigne2).trim()}` : '') +
      `, ${f.codePostal} ${String(f.ville).toUpperCase()}` +
      `, ${f.pays}`;

    const utilisateurData = {
      nom: String(f.nom || '').trim(),
      prenom: String(f.prenom || '').trim(),
      email: String(f.email || '').trim(),
      telephone: String(f.telephone || '').trim(),
      adresse: adresseComposee,
      dateNaissance: f.dateNaissance,
      role: String(f.role || '').toUpperCase(),
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

        if (this.roleMembreSeul) {
          // créer membre adulte
          const membreSeul = this.cleanMembre({
            nom: utilisateurData.nom,
            prenom: utilisateurData.prenom,
            dateNaissance: utilisateurData.dateNaissance
          }, utilisateurId);

          this.http.post(`${environment.apiUrl}/membres`, membreSeul).subscribe({
            next: (membre: any) => {
              if (membre?.id) localStorage.setItem('membreId', String(membre.id));
              this.finaliser();
            },
            error: () => {
              this.erreurMessage = "Erreur lors de l'ajout du membre pratiquant seul.";
              this.loading = false;
            }
          });
          return;
        }

        // parent → créer les membres
        const membres: MembrePayload[] = (this.membresForm.value.membres || [])
          .map((m: any) => this.cleanMembre(m, utilisateurId));

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
                this.erreurMessage = `Le numéro de licence ${membre.numeroLicence ?? ''} est déjà utilisé.`;
              } else {
                this.erreurMessage = "Erreur lors de l'ajout des membres.";
              }
              if (count + erreurs === membres.length) this.loading = false;
            }
          });
        }
      },
      error: () => {
        this.loading = false;
        this.erreurMessage = "Erreur lors de l'inscription.";
      }
    });
  }

  finaliser(): void {
    this.loading = false;
    this.clearLocal();
    this.step = 3;
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
