import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UiButtonComponent } from '../../shared/ui/buttons/ui-button/ui-button.component';
import { UiModalComponent } from '../../shared/ui/modal/ui-modal.component';
import { UiTableComponent } from '../../shared/components/ui-table/ui-table.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card/kpi-card.component';
import { KpiGridComponent } from '../../shared/ui/kpi-grid/kpi-grid.component';

@Component({
  standalone: true,
  selector: 'app-super-admin-admins',
  templateUrl: './admins.component.html',
  styleUrls: ['./admins.component.css'],
  imports: [CommonModule, FormsModule, UiButtonComponent, UiModalComponent, UiTableComponent, PageHeaderComponent, KpiCardComponent, KpiGridComponent]
})
export class AdminsComponent {
  getClubName(clubId: any): string {
    const club = this.clubs.find(c => c.id === clubId);
    return club ? club.name : '-';
  }
  apiUrl = environment.apiUrl + '/utilisateurs';
  tableActions = [];

  newAdmin: any = {
    nom: '',
    prenom: '',
    email: '',
    // Le mot de passe n'est plus requis côté UI : un lien de définition sera envoyé par email
    password: '',
    role: 'ADMIN',
    clubId: null
  };

  clubs: any[] = [];
  loading = false;
  message = '';
  admins: any[] = [];
  adminsTable: any[] = [];

  get nbAdmins()        { return this.admins.length; }
  get clubsCouvertIds() { return new Set(this.admins.map(a => a.clubId).filter(Boolean)).size; }
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
      next: data => {
        this.admins = data || [];
        this.adminsTable = this.admins.map(a => ({ ...a, clubName: this.getClubName(a.clubId) }));
      },
      error: err => console.error('Impossible de charger les admins', err)
    });
  }

  createAdmin() {
  if (!this.newAdmin.email || !this.newAdmin.nom) {
      this.message = 'Nom et email sont requis.';
      return;
    }
    this.loading = true;
    this.message = '';

    const payload = { ...this.newAdmin };

    // Création via endpoint admin: mot de passe temporaire et email de réinitialisation envoyés automatiquement
    this.http.post(this.apiUrl, payload).subscribe({
      next: (res: any) => {
        this.message = res?.message || 'Admin créé avec succès. Un email de définition du mot de passe a été envoyé.';
        this.loading = false;
        this.newAdmin = { nom: '', prenom: '', email: '', password: '', role: 'ADMIN', clubId: null };
        this.showModal = false;
        this.loadAdmins();
      },
      error: (err: any) => {
        console.error(err);
        this.message = err?.error?.message || 'Erreur lors de la création';
        this.loading = false;
      }
    });
  }

  onTableAction(event: { action: string; row: any }): void {
    // À compléter selon les actions souhaitées (ex : suppression, édition)
  }

  // ...existing code...
}