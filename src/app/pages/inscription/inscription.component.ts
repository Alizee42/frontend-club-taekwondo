import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inscription',
  standalone: true,
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class InscriptionComponent {
  inscriptionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.inscriptionForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/)
      ]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      numeroLicence: [''], // Facultatif
      adresse: ['', Validators.required],
      ceinture: [''], // Facultatif
      statutSante: ['Non renseigné'], // Valeur par défaut
      dateNaissance: [''] // Facultatif
    });
  }

  onSubmit() {
    if (this.inscriptionForm.valid) {
      const formData = this.inscriptionForm.value;

      this.authService.register(formData).subscribe(
        (response) => {
          console.log('Inscription réussie :', response);
          alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
          this.router.navigate(['/connexion']); // Redirection vers la page de connexion
        },
        (error) => {
          console.error('Erreur lors de l\'inscription :', error);
          alert(error.error?.message || 'Une erreur est survenue lors de l\'inscription.');
        }
      );
    } else {
      alert('Veuillez remplir tous les champs obligatoires.');
    }
  }
}