import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { GalerieService, Galerie } from '../../services/galerie.service';

@Component({
  selector: 'app-galerie',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './galerie.component.html',
  styleUrls: ['./galerie.component.css']
})
export class GalerieComponent implements OnInit {
  images: Galerie[] = [];

  constructor(private galerieService: GalerieService) {}

  ngOnInit(): void {
    this.loadImages();
  }

  loadImages(): void {
    this.galerieService.getAll().subscribe((data) => {
      this.images = data;
    });
  }
}