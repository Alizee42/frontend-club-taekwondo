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
  isSubmitted = false;
  step = 1;
  showConfirmationModal = false;
  erreurMessage = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.utilisateurForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      adresse: ['', Validators.required],
      telephone: ['', Validators.required],
      role: ['PARENT', Validators.required]
    }, { validators: this.matchPasswords });

    this.membresForm = this.fb.group({
      membres: this.fb.array([])
    });
  }

  /** Vérifie que password et confirmPassword sont identiques */
  matchPasswords: ValidatorFn = (group: AbstractControl): { [key: string]: boolean } | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  };

  get membres(): FormArray {
    return this.membresForm.get('membres') as FormArray;
  }

  addMembre(): void {
    const membre = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      ceinture: [''],
      numeroLicence: ['']
    });
    this.membres.push(membre);
  }

  removeMembre(index: number): void {
    this.membres.removeAt(index);
  }

  nextStep(): void {
    if (this.step === 1 && this.utilisateurForm.invalid) return;
    if (this.step === 2 && this.membresForm.invalid) return;
    this.step++;
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  closeModal(): void {
    this.showConfirmationModal = false;
  }

  onSubmit(): void {
    this.erreurMessage = '';

    if (this.utilisateurForm.invalid) return;
    if (this.utilisateurForm.errors?.['passwordMismatch']) {
      this.erreurMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const utilisateurData = { ...this.utilisateurForm.value };
    delete utilisateurData.confirmPassword;

    this.http.post('/api/utilisateurs', utilisateurData).subscribe({
      next: (utilisateur: any) => {
        const utilisateurId = utilisateur.id;
        const membres: MembrePayload[] = this.membresForm.value.membres;

        if (!membres || membres.length === 0) {
          this.step = 3;
          this.showConfirmationModal = true;
          return;
        }

        const requests = membres.map((m: MembrePayload) => ({
          ...m,
          utilisateurId
        }));

        let count = 0;
        for (let membre of requests) {
          this.http.post('/api/membres', membre).subscribe({
            next: () => {
              count++;
              if (count === requests.length) {
                this.step = 3;
                this.showConfirmationModal = true;
              }
            },
            error: err => {
              console.error('Erreur membre :', err);
              this.erreurMessage = 'Une erreur est survenue lors de l’ajout des membres.';
            }
          });
        }
      },
      error: err => {
        console.error('Erreur utilisateur :', err);
        if (err.status === 409) {
          this.erreurMessage = 'Cet email est déjà utilisé. Veuillez en choisir un autre.';
        } else {
          this.erreurMessage = 'Une erreur est survenue lors de l’inscription.';
        }
      }
    });
  }
}
