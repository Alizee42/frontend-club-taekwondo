import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent {
  constructor(private router: Router) {}

  navigateToHoraires(): void {
    this.router.navigate(['/admin/horaires']); // Redirige vers la page Gestion des Horaires
  }
  navigateToprofesseurs(): void {
    this.router.navigate(['/admin/professeurs']); // Redirige vers la page Gestion des Horaires
  }
}