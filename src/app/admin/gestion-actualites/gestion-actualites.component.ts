import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imageUrl: string | ArrayBuffer | null = null;
  imageError: string = '';

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

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const fileType = file.type.split('/')[0];
      if (fileType !== 'image') {
        this.imageError = 'Veuillez télécharger une image valide.';
        this.imageUrl = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.imageUrl = reader.result;
        this.actualite.imageUrl = this.imageUrl as string;
        this.imageError = '';
      };
      reader.readAsDataURL(file);
    }
  }

  editActualite(actu: Actualite): void {
    this.actualite = { ...actu };
    this.imageUrl = actu.imageUrl || null;
    this.imageError = '';
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
    this.imageUrl = null;
    this.imageError = '';
  }

  setFeatured(selectedActu: Actualite): void {
    this.actualites.forEach(actu => {
      if (actu.id !== selectedActu.id) {
        actu.isFeatured = false;
        this.actualiteService.update(actu.id!, actu).subscribe();
      }
    });

    selectedActu.isFeatured = true;
    this.actualiteService.update(selectedActu.id!, selectedActu).subscribe(() => {
      this.loadActualites();
    });
  }
}