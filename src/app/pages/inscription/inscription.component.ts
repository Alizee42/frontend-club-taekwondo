import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReactiveFormsModule } from '@angular/forms'; // Importer ReactiveFormsModule
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-inscription',
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css'],
  imports: [ReactiveFormsModule, CommonModule] 
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
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/) // Accepte tous les caractères spéciaux
      ]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
    });
  }

  onSubmit() {
    if (this.inscriptionForm.valid) {
      const formData = this.inscriptionForm.value;
      this.authService.register(formData).subscribe(
        (response) => {
          console.log('Inscription réussie :', response);
          alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
          this.router.navigate(['/login']); // Redirige vers la page de connexion
        },
        (error) => {
          console.error('Erreur lors de l\'inscription :', error);
          alert(error.error.message || 'Une erreur est survenue lors de l\'inscription.');
        }
      );
    } else {
      console.log('Formulaire invalide :', this.inscriptionForm);
      console.log('Erreurs :', this.inscriptionForm.errors);
      alert('Veuillez remplir tous les champs obligatoires.');
    }
  }
}