import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { EvenementService } from '../../../services/evenement.service';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-evenements-liste',
  standalone: true,
  templateUrl: './evenements-liste.component.html',
  styleUrls: ['./evenements-liste.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    OverlayModule,
  ],
})
export class EvenementsListeComponent implements OnInit {
  evenements: any[] = [];
  modalVisible = false;

  // Colonnes affichées dans le tableau
  displayedColumns: string[] = [
    'titre',
    'dateDebut',
    'dateFin',
    'lieu',
    'capacite',
    'description',
    'image',
    'actions',
  ];

  newEvent = {
    titre: '',
    dateDebut: '',
    heureDebut: '',
    dateFin: '',
    heureFin: '',
    lieu: '',
    capacite: 1,
    description: '',
  };

  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(private evenementService: EvenementService) {}

  ngOnInit(): void {
    this.chargerEvenements();
  }

  // Charge la liste des événements depuis le backend
  chargerEvenements(): void {
    this.evenementService.getAllEvenements().subscribe({
      next: (data) => (this.evenements = data),
      error: () => alert('Erreur de chargement des événements'),
    });
  }

  // Ouvre le modal pour ajouter un événement
  ouvrirModal(): void {
    this.modalVisible = true; // Affiche la modale
  }

  // Ferme le modal et réinitialise le formulaire
  fermerModal(): void {
    this.modalVisible = false;
    this.resetForm();
  }

  // Réinitialise le formulaire et les fichiers sélectionnés
  resetForm(): void {
    this.newEvent = {
      titre: '',
      dateDebut: '',
      heureDebut: '',
      dateFin: '',
      heureFin: '',
      lieu: '',
      capacite: 1,
      description: '',
    };
    this.selectedFile = null;
    this.imagePreview = null;
  }

  // Gère la sélection d'un fichier
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  // Ajoute un nouvel événement
  ajouterEvenement(): void {
    // Vérification des champs obligatoires
    if (
      !this.newEvent.titre ||
      !this.newEvent.dateDebut ||
      !this.newEvent.heureDebut ||
      !this.newEvent.dateFin ||
      !this.newEvent.heureFin ||
      !this.newEvent.lieu ||
      !this.newEvent.capacite ||
      !this.newEvent.description
    ) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // Vérification de la sélection d'une image
    if (!this.selectedFile) {
      alert('Veuillez sélectionner une image.');
      return;
    }

    // Vérification que la date de fin est après la date de début
    const dateDebut = new Date(`${this.newEvent.dateDebut}T${this.newEvent.heureDebut}`);
    const dateFin = new Date(`${this.newEvent.dateFin}T${this.newEvent.heureFin}`);
    if (dateFin <= dateDebut) {
      alert('La date de fin doit être postérieure à la date de début.');
      return;
    }

    // Création de l'objet FormData
    const formData = new FormData();
    formData.append('titre', this.newEvent.titre);
    formData.append('dateDebut', `${this.newEvent.dateDebut}T${this.newEvent.heureDebut}`);
    formData.append('dateFin', `${this.newEvent.dateFin}T${this.newEvent.heureFin}`);
    formData.append('lieu', this.newEvent.lieu);
    formData.append('capacite', this.newEvent.capacite.toString());
    formData.append('description', this.newEvent.description);
    formData.append('image', this.selectedFile);

    // Appel au service pour ajouter l'événement
    this.evenementService.ajouterEvenement(formData).subscribe({
      next: () => {
        alert("L'événement a été ajouté avec succès !");
        this.fermerModal();
        this.chargerEvenements();
      },
      error: (err) => {
        console.error("Erreur lors de l'ajout de l'événement :", err);
        alert("Une erreur est survenue lors de l'ajout de l'événement. Veuillez réessayer.");
      },
    });
  }

  // Supprime un événement
  supprimerEvenement(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      this.evenementService.supprimerEvenement(id).subscribe({
        next: () => {
          alert('Événement supprimé avec succès.');
          this.chargerEvenements();
        },
        error: (err) => {
          console.error("Erreur lors de la suppression de l'événement :", err);
          alert('Une erreur est survenue lors de la suppression.');
        },
      });
    }
  }
}