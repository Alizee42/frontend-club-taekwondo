import { Component, OnInit } from '@angular/core';
import { GalerieService, Galerie } from '../../services/galerie.service';
import { FormsModule } from '@angular/forms'; // Import nécessaire pour [(ngModel)]
import { CommonModule } from '@angular/common'; // Import pour les directives Angular de base

@Component({
  selector: 'app-gestion-galerie',
  templateUrl: './gestion-galerie.component.html',
  styleUrls: ['./gestion-galerie.component.css'],
  standalone: true, // Si vous utilisez Angular 14 standalone
  imports: [CommonModule, FormsModule], // Ajout des modules nécessaires
})
export class GestionGalerieComponent implements OnInit {
  images: Galerie[] = [];
  newImage: Partial<Galerie> = {};
  imageUrl: string | null = null;

  constructor(private galerieService: GalerieService) {}

  ngOnInit(): void {
    this.loadImages();
  }

  loadImages(): void {
    this.galerieService.getAll().subscribe(
      (data) => {
        this.images = data;
      },
      (error) => {
        console.error('Erreur lors du chargement des images :', error);
      }
    );
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imageUrl = reader.result as string;
        this.newImage.imageUrl = this.imageUrl;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadImage(): void {
    if (this.newImage.titre && this.newImage.description && this.newImage.imageUrl) {
      this.galerieService.create(this.newImage as Galerie).subscribe(
        () => {
          this.loadImages();
          this.newImage = {};
          this.imageUrl = null;
        },
        (error) => {
          console.error('Erreur lors de l\'ajout de l\'image :', error);
        }
      );
    } else {
      console.warn('Tous les champs sont requis pour ajouter une image.');
    }
  }

  deleteImage(id: string | undefined): void {
    if (!id) {
      console.error('ID non défini, impossible de supprimer l\'image.');
      return;
    }
  
    this.galerieService.delete(id).subscribe(
      () => {
        this.loadImages();
      },
      (error) => {
        console.error('Erreur lors de la suppression de l\'image :', error);
      }
    );
  }
  editImage(image: any): void {
    // Pré-remplir le formulaire avec les données de l'image à modifier
    this.newImage = { ...image };
    this.imageUrl = image.imageUrl;
  }
}