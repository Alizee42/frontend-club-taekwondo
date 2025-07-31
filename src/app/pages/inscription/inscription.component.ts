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
import { HttpClient, HttpClientModule } from '@angular/common/http';

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
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
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
  roleMembreSeul: boolean = false; // Ajout pour la logique

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.utilisateurForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      adresse: ['', Validators.required],
      telephone: ['', Validators.required],
      role: ['', Validators.required]
    }, { validators: this.matchPasswords });

    this.membresForm = this.fb.group({
      membres: this.fb.array([])
    });

    const savedForm = localStorage.getItem('inscriptionData');
    if (savedForm) {
      const data = JSON.parse(savedForm);
      this.utilisateurForm.patchValue(data.utilisateur);
      data.membres.forEach((m: any) => this.addMembre(m));
    }

    this.utilisateurForm.valueChanges.subscribe(() => this.saveLocal());
    this.membresForm.valueChanges.subscribe(() => this.saveLocal());
  }

  matchPasswords: ValidatorFn = (group: AbstractControl): { [key: string]: boolean } | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  };

  get membres(): FormArray {
    return this.membresForm.get('membres') as FormArray;
  }

  addMembre(values?: any): void {
    const membre = this.fb.group({
      nom: [values?.nom || '', Validators.required],
      prenom: [values?.prenom || '', Validators.required],
      dateNaissance: [values?.dateNaissance || '', Validators.required],
      ceinture: [values?.ceinture || ''],
      numeroLicence: [values?.numeroLicence || '']
    });
    this.membres.push(membre);
  }

  removeMembre(index: number): void {
    this.membres.removeAt(index);
    this.saveLocal();
  }

  onRoleChange(): void {
    const role = this.utilisateurForm.get('role')?.value;
    this.roleMembreSeul = role === 'MEMBRE';
    if (this.roleMembreSeul) {
      this.step = 1; // Toujours sur l'étape 1
    }
  }

  nextStep(): void {
    if (this.step === 1 && this.utilisateurForm.invalid) return;
    if (!this.roleMembreSeul && this.step === 2 && this.membresForm.invalid) return;
    if (this.roleMembreSeul) {
      this.step = 3; // Passe directement à la confirmation
    } else {
      this.step++;
    }
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  closeModal(): void {
    this.showConfirmationModal = false;
  }

  togglePassword(): void {
    this.togglePasswordVisibility = !this.togglePasswordVisibility;
  }

  toggleConfirmPassword(): void {
    this.toggleConfirmPasswordVisibility = !this.toggleConfirmPasswordVisibility;
  }

  isInvalid(field: string): boolean {
    const control = this.utilisateurForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  redirectToLogin(): void {
    window.location.href = '/connexion';
  }

  saveLocal(): void {
    localStorage.setItem('inscriptionData', JSON.stringify({
      utilisateur: this.utilisateurForm.value,
      membres: this.membresForm.value.membres
    }));
  }

  clearLocal(): void {
    localStorage.removeItem('inscriptionData');
  }

  onSubmit(): void {
    this.erreurMessage = '';
    this.loading = true;

    if (this.utilisateurForm.invalid || this.utilisateurForm.errors?.['passwordMismatch']) {
      this.erreurMessage = 'Formulaire invalide ou mots de passe non identiques.';
      this.loading = false;
      return;
    }

    const utilisateurData = { ...this.utilisateurForm.value };
    delete utilisateurData.confirmPassword;
    utilisateurData.role = utilisateurData.role.toUpperCase();

    this.http.post('/api/utilisateurs/register', utilisateurData).subscribe({
      next: (utilisateur: any) => {
        const utilisateurId = utilisateur.id;
        const membres: MembrePayload[] = this.membresForm.value.membres;

               if (this.roleMembreSeul) {
          // Création du membre pratiquant seul
          const membreSeul: MembrePayload = {
            nom: utilisateurData.nom,
            prenom: utilisateurData.prenom,
            dateNaissance: utilisateurData.dateNaissance,
            ceinture: '',
            numeroLicence: '',
            utilisateurId
          };
          this.http.post('/api/membres', membreSeul).subscribe({
            next: (membre: any) => {
              localStorage.setItem('membreId', membre.id.toString()); // AJOUT ICI
              this.finaliser();
            },
            error: () => {
              this.erreurMessage = "Erreur lors de l'ajout du membre pratiquant seul.";
              this.loading = false;
            }
          });
          return;
        }

        if (!membres || membres.length === 0) {
          this.finaliser();
          return;
        }

        let count = 0;
        let erreurs = 0;
        const requests = membres.map(m => ({ ...m, utilisateurId }));

        for (let membre of requests) {
          this.http.post('/api/membres', membre).subscribe({
            next: () => {
              count++;
              if (count + erreurs === requests.length && erreurs === 0) this.finaliser();
              if (count + erreurs === requests.length) this.loading = false;
            },
            error: err => {
              erreurs++;
              if (err.status === 400 && err.error?.message?.includes('numéro de licence')) {
                this.erreurMessage = `Le numéro de licence ${membre.numeroLicence} est déjà utilisé.`;
              } else {
                this.erreurMessage = "Erreur lors de l'ajout des membres.";
              }
              if (count + erreurs === requests.length) this.loading = false;
            }
          });
        }
      },
      error: err => {
        this.loading = false;
        if (err.status === 409 || err.status === 400) {
          this.erreurMessage = err.error?.message || 'Email déjà utilisé.';
        } else {
          this.erreurMessage = "Erreur lors de l'inscription.";
        }
      }
    });
  }

  finaliser(): void {
    this.loading = false;
    this.clearLocal();
    this.step = 3;
    this.showConfirmationModal = true;
  }
}