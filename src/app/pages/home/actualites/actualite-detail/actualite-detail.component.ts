import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common'; // Importer CommonModule pour le DatePipe
import { ActualiteService } from '../../../../services/actualite.service';

@Component({
  selector: 'app-actualite-detail',
  standalone: true, // Déclarez le composant comme autonome
  imports: [CommonModule], // Ajoutez CommonModule ici
  templateUrl: './actualite-detail.component.html',
  styleUrls: ['./actualite-detail.component.css']
})
export class ActualiteDetailComponent implements OnInit {
  actualite: any = null;

  constructor(
    private route: ActivatedRoute,
    private actualiteService: ActualiteService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id'); // Récupérer l'ID depuis l'URL
    if (id) {
      this.actualiteService.getById(id).subscribe({
        next: (data: any) => {
          this.actualite = data; // Charger les détails de l'actualité
        },
        error: (err: any) => {
          console.error('Erreur lors du chargement de l\'actualité :', err);
        }
      });
    }
  }
}