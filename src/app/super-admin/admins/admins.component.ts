import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-super-admin-admins',
  templateUrl: './admins.component.html',
  styleUrls: ['./admins.component.css'],
  imports: [CommonModule, FormsModule]
})
export class AdminsComponent {
  apiUrl = environment.apiUrl + '/utilisateurs';

  newAdmin: any = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'ADMIN',
    clubId: null
  };

  clubs: any[] = [];
  loading = false;
  message = '';
  admins: any[] = [];
  showModal = false;

  constructor(private http: HttpClient) {
    this.loadClubs();
    this.loadAdmins();
  }

  loadClubs() {
    this.http.get<any[]>(environment.apiUrl + '/clubs').subscribe({
      next: data => this.clubs = data || [],
      error: err => console.error('Impossible de charger les clubs', err)
    });
  }

  loadAdmins() {
    this.http.get<any[]>(this.apiUrl + '?role=ADMIN').subscribe({
      next: data => this.admins = data || [],
      error: err => console.error('Impossible de charger les admins', err)
    });
  }

  createAdmin() {
    if (!this.newAdmin.email || !this.newAdmin.password || !this.newAdmin.nom) {
      this.message = 'Nom, email et mot de passe sont requis.';
      return;
    }
    this.loading = true;
    this.message = '';

    const payload = { ...this.newAdmin };

    this.http.post(this.apiUrl + '/register', payload).subscribe({
      next: (res: any) => {
        this.message = 'Admin créé avec succès.';
        this.loading = false;
        this.newAdmin = { nom: '', prenom: '', email: '', password: '', role: 'ADMIN', clubId: null };
        this.showModal = false;
        this.loadAdmins();
      },
      error: err => {
        console.error(err);
        this.message = err?.error?.message || 'Erreur lors de la création';
        this.loading = false;
      }
    });
  }
}