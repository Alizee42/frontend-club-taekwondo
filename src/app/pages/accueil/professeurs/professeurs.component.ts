import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfesseurService, Professeur } from '../../../services/professeur.service';

@Component({
  selector: 'app-professeurs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './professeurs.component.html',
  styleUrls: ['./professeurs.component.css'],
})
export class ProfesseursComponent implements OnInit {
  professeurs: Professeur[] = [];

  constructor(private professeurService: ProfesseurService) {}

  ngOnInit(): void {
    this.loadProfesseurs();
  }

  loadProfesseurs(): void {
    this.professeurs = this.professeurService.getProfesseurs();
  }
}