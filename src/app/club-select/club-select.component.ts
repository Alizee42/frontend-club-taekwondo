import { Component } from '@angular/core';
import { EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../shared/ui/buttons/ui-button/ui-button.component';
import { Club, ClubService } from '../services/club.service';

@Component({
  selector: 'app-club-select',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  templateUrl: './club-select.component.html',
  styleUrls: ['./club-select.component.css']
})
export class ClubSelectComponent {
  clubs: Club[] = [];
  loading = false;
  error: string | null = null;

  // Ajout EventEmitter pour transmettre le club au parent
  @Output() clubSelected = new EventEmitter<Club>();

  // Ajout EventEmitter pour fermeture de la modale
  @Output() closeModal = new EventEmitter<void>();

  selectClub(club: Club) {
    this.clubSelected.emit(club);
    console.log('Club sélectionné :', club);
  }

  // Méthode pour fermeture de la modale (overlay ou bouton)
  closeModalFn() {
    this.closeModal.emit();
  }

  // Exemple d'init – adapte selon ta logique réelle
  constructor(private clubService: ClubService) {}

  ngOnInit() {
    this.loading = true;
    this.clubService.getClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des clubs';
        this.loading = false;
      }
    });
  }
}
