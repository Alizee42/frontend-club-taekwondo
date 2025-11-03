import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubService } from '../../../services/club.service';
import { EnseignantService, Enseignant } from '../../../services/enseignant.service';

@Component({
  selector: 'app-professeurs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './professeurs.component.html',
  styleUrls: ['./professeurs.component.css'],
})
export class ProfesseursComponent implements OnInit {
  // On conserve la forme utilisée par le template (photo, nom, prenom...)
  professeurs: Array<{
    id?: number;
    nom: string;
    prenom: string;
    specialite?: string;
    description?: string;
    photo?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  }> = [];

  constructor(
    private clubService: ClubService,
    private enseignantService: EnseignantService
  ) {}

  ngOnInit(): void {
    const club = this.clubService.getSelectedClub();
    const clubId = club?.id;
    if (!clubId) {
      // Pas de club sélectionné: garder la liste vide
      return;
    }
    this.enseignantService.getByClub(clubId).subscribe({
      next: (list: Enseignant[]) => {
        this.professeurs = list.map((e) => ({
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          specialite: e.specialite,
          description: e.description,
          photo: e.photoUrl || 'assets/images/default-teacher.jpg',
          facebook: e.facebook,
          instagram: e.instagram,
          linkedin: e.linkedin,
        }));
      },
      error: () => {
        this.professeurs = [];
      }
    });
  }
}