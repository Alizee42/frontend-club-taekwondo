import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray
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

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    // Formulaire de l'utilisateur (étape 1)
    this.utilisateurForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      dateNaissance: ['', Validators.required],
      adresse: ['', Validators.required],
      telephone: ['', Validators.required],
      role: ['PARENT', Validators.required]
    });

    // Formulaire des membres (étape 2)
    this.membresForm = this.fb.group({
      membres: this.fb.array([])
    });
  }

  // Accès rapide aux membres
  get membres(): FormArray {
    return this.membresForm.get('membres') as FormArray;
  }

  // Ajouter un membre
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

  // Supprimer un membre
  removeMembre(index: number): void {
    this.membres.removeAt(index);
  }

  // Étapes (navigation)
  nextStep(): void {
    if (this.step === 1 && this.utilisateurForm.invalid) return;
    if (this.step === 2 && this.membresForm.invalid) return;
    this.step++;
  }

  previousStep(): void {
    if (this.step > 1) this.step--;
  }

  // Soumission finale
  onSubmit(): void {
    if (this.utilisateurForm.invalid) return;

    const utilisateurData = this.utilisateurForm.value;

    this.http.post('/api/utilisateurs', utilisateurData).subscribe({
      next: (utilisateur: any) => {
        const utilisateurId = utilisateur.id;
        const membres: MembrePayload[] = this.membresForm.value.membres;

        if (!membres || membres.length === 0) {
          this.isSubmitted = true;
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
                this.isSubmitted = true;
              }
            },
            error: err => console.error('Erreur membre :', err)
          });
        }
      },
      error: err => console.error('Erreur utilisateur :', err)
    });
  }
}
