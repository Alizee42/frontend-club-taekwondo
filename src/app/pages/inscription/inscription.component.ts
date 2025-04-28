import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Import de CommonModule pour *ngIf et autres directives Angular

@Component({
  selector: 'app-inscription',
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css'],
  standalone: true, // Indique que c'est un composant autonome
  imports: [ReactiveFormsModule, CommonModule] // Ajout de CommonModule
})
export class InscriptionComponent {
  inscriptionForm: FormGroup;
  step = 1; // Étape actuelle du formulaire

  constructor(private fb: FormBuilder) {
    this.inscriptionForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      adresse: ['', Validators.required], 
      paymentType: ['none', Validators.required],
      medicalCert: [null],
      photoId: [null]
    });    
  }

  nextStep() {
    if (this.step < 4) {
      this.step++;
    }
  }

  onFileChange(event: any, controlName: string) {
    const file = event.target.files[0];
    if (file) {
      this.inscriptionForm.patchValue({ [controlName]: file });
    }
  }

  onSubmit() {
    if (this.inscriptionForm.valid) {
      console.log(this.inscriptionForm.value);
      // Ici : traitement pour enregistrer les données
    } else {
      alert('Veuillez remplir tous les champs obligatoires.');
    }
  }

  submitForm() {
    this.onSubmit();
  }
}