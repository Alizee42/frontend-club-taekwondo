import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent {
  constructor(private router: Router) {}

  // Méthodes pour gérer les différentes sections
  manageSchedules() {
    this.router.navigate(['/admin/schedules']); // Redirige vers la gestion des horaires
  }

  manageTeachers() {
    this.router.navigate(['/admin/teachers']); // Redirige vers la gestion des professeurs
  }

  manageReviews() {
    this.router.navigate(['/admin/reviews']); // Redirige vers la gestion des avis
  }

  manageRegistrations() {
    this.router.navigate(['/admin/registrations']); // Redirige vers la gestion des inscriptions
  }

  manageGallery() {
    this.router.navigate(['/admin/gallery']); // Redirige vers la gestion de la galerie
  }
}