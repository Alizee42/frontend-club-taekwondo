import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Pour le pipe 'date'
import { FormsModule } from '@angular/forms'; // Pour 'ngModel'
import { ActualiteService } from '../../services/actualite.service';

interface Actualite {
  id?: string;
  titre: string;
  contenu: string;
  typeActu: string;
  datePublication: string;
  isFeatured?: boolean;
  imageUrl?: string;
}

@Component({
  selector: 'app-gestion-actualites',
  standalone: true,
  templateUrl: './gestion-actualites.component.html',
  styleUrls: ['./gestion-actualites.component.css'],
  imports: [CommonModule, FormsModule]
})
export class GestionActualitesComponent implements OnInit {
  actualites: Actualite[] = [];
  imageUrl: string | ArrayBuffer | null = null;  // Variable pour gérer l'aperçu de l'image
  imageError: string = '';  // Message d'erreur pour l'image

  // Objet actualité par défaut
  actualite: Actualite = {
    titre: '',
    contenu: '',
    typeActu: '',
    datePublication: new Date().toISOString(),
    isFeatured: false,
    imageUrl: ''
  };

  constructor(private actualiteService: ActualiteService) {}

  ngOnInit(): void {
    this.loadActualites();
  }

  loadActualites(): void {
    this.actualiteService.getAll().subscribe((data: Actualite[]) => {
      this.actualites = data;
    });
  }

  onSubmit(): void {
    // S'assurer que la date est bien au format ISO
    this.actualite.datePublication = new Date().toISOString();

    if (this.actualite.id) {
      this.actualiteService.update(this.actualite.id, this.actualite).subscribe(() => {
        this.loadActualites();
        this.resetForm();
        alert('Actualité mise à jour avec succès!');
      });
    } else {
      this.actualiteService.create(this.actualite).subscribe(() => {
        this.loadActualites();
        this.resetForm();
        alert('Actualité ajoutée avec succès!');
      });
    }
  }

  // Fonction pour sélectionner une image depuis l'ordinateur et prévisualiser
  onImageSelected(event: any): void {
    const file = event.target.files[0]; // Récupère le fichier sélectionné
    if (file) {
      const fileType = file.type.split('/')[0];
      if (fileType !== 'image') {
        this.imageError = 'Veuillez télécharger une image valide.';
        this.imageUrl = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.imageUrl = reader.result; // Stocke l'URL de l'image pour l'aperçu
        this.actualite.imageUrl = this.imageUrl as string;  // Met à jour l'objet actualité avec l'URL de l'image
        this.imageError = '';  // Réinitialiser le message d'erreur
      };
      reader.readAsDataURL(file); // Convertit le fichier en URL pour l'aperçu
    }
  }

  editActualite(actu: Actualite): void {
    this.actualite = { ...actu };
    // Si une image est présente, elle sera affichée
    this.imageUrl = actu.imageUrl || null;
    this.imageError = '';  // Réinitialiser l'erreur d'image
  }

  deleteActualite(id: string): void {
    this.actualiteService.delete(id).subscribe(() => {
      this.loadActualites();
      alert('Actualité supprimée avec succès!');
    });
  }

  resetForm(): void {
    this.actualite = {
      titre: '',
      contenu: '',
      typeActu: '',
      datePublication: new Date().toISOString(),
      isFeatured: false,
      imageUrl: ''
    };
    this.imageUrl = null;  // Réinitialiser l'aperçu de l'image
    this.imageError = '';  // Réinitialiser l'erreur d'image
  }
}
