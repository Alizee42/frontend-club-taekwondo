import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HorairesService } from '../../../services/horaires.service';

@Component({
  selector: 'app-horaires',
  templateUrl: './horaires.component.html',
  styleUrls: ['./horaires.component.css'],
  standalone: true,
  imports: [CommonModule] // Ajout de CommonModule pour activer *ngFor et *ngIf
})
export class HorairesComponent implements OnInit {
  horaires: any[] = [];

  constructor(private horairesService: HorairesService) {}

  ngOnInit(): void {
    this.horaires = this.horairesService.getHoraires();
  }
}