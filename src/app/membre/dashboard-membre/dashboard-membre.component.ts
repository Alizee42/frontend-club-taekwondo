import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient} from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { DashboardCardComponent } from '../../dashboard/shared/dashboard-card/dashboard-card.component';
import { AuthService } from '../../services/auth.service';
import { UiTitleComponent } from '../../ui/ui-title/ui-title.component';



interface Utilisateur {
  id: number | string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;        // <-- ajouté
  dateNaissance?: string;    // <-- ajouté (ISO yyyy-MM-dd)
  role?: string;
  avatar?: string;           // <-- ajouté pour l'avatar
}

@Component({
  standalone: true,
  selector: 'app-dashboard-membre',
  templateUrl: './dashboard-membre.component.html',
  styleUrls: ['./dashboard-membre.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardMembreComponent implements OnInit {
  private readonly API_BASE = environment.apiUrl;

  navigateToProfil(): void {
    this.router.navigate(['/profil']);
  }

  navigateToSupport(): void {
    this.router.navigate(['/contact']);
  }

  utilisateurConnecte: Utilisateur | null = null;

  // Documents obligatoires (même référentiel que DocumentsComponent)
  requiredDocuments: Array<{ type: string; label: string; uploaded: boolean; etat: string }> = [
    { type: 'CERTIFICAT_MEDICAL', label: 'Certificat médical (< 1 an)', uploaded: false, etat: 'non_envoyé' },
    { type: 'PHOTO_IDENTITE',     label: "Photo d'identité",            uploaded: false, etat: 'non_envoyé' },
    { type: 'DOCUMENT_IDENTITE',  label: "Document d'identité",         uploaded: false, etat: 'non_envoyé' }
  ];
  documents: any[] = [];

  stats = {
    paiementsEnRetard: 0,
    documentsManquants: 0,
    commandesEnCours: 0,
    evenementsAVenir: 2
  };

  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}


  ngOnInit(): void {
    this.loadUtilisateur();
    this.loadDocuments();
  }
  // --- Documents manquants ---
  private getAuthHeaders(): any {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  loadDocuments(): void {
    const utilisateurId = this.utilisateurConnecte?.id || localStorage.getItem('utilisateurId');
    if (!utilisateurId) return;
    this.http.get<any[]>(`${this.API_BASE}/documents/utilisateur/${utilisateurId}`, { headers: this.getAuthHeaders() }).subscribe({
      next: (documents) => {
        this.documents = Array.isArray(documents) ? documents : [];
        this.updateRequiredDocumentsStatus();
      },
      error: (err) => {
        this.documents = [];
        this.updateRequiredDocumentsStatus();
      }
    });
  }

  updateRequiredDocumentsStatus(): void {
    this.requiredDocuments = this.requiredDocuments.map(req => {
      const code = req.type;
      const docsOfType = this.documents.filter(d => this.unifyType(d.typeDocument) === code);
      if (docsOfType.length === 0) {
        return { ...req, uploaded: false, etat: 'non_envoyé' };
      }
      if (docsOfType.some(d => this.normalizeStatus(d.status) === 'validé')) {
        return { ...req, uploaded: true, etat: 'validé' };
      }
      if (docsOfType.some(d => this.normalizeStatus(d.status) === 'refusé')) {
        return { ...req, uploaded: false, etat: 'refusé' };
      }
      return { ...req, uploaded: true, etat: 'en_attente' };
    });
    // Met à jour le nombre réel de documents manquants
    this.stats.documentsManquants = this.requiredDocuments.filter(doc => doc.etat === 'non_envoyé' || doc.etat === 'refusé').length;
  }

  unifyType(input: any): string {
    const raw = String(input || '').trim();
    if (!raw) return raw;
    const norm = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[\s'’_-]+/g, '');
    for (const t of this.requiredDocuments) {
      const candidates = [t.type, t.label];
      if (candidates.some(c => String(c).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[\s'’_-]+/g, '') === norm)) {
        return t.type;
      }
    }
    return raw;
  }

  private normalizeStatus(s: any): string {
    const v = String(s || '').toLowerCase();
    if (["valide", "validé", "validee", "validée", "approved"].includes(v)) return "validé";
    if (["pending", "en_attente", "en attente", "attente"].includes(v)) return "en_attente";
    if (["refuse", "refusé", "refusee", "refusée", "rejected"].includes(v)) return "refusé";
    return "en_attente";
  }

    private loadUtilisateur(): void {
    // 🔹 On vérifie juste que l'utilisateur est connecté via le service
    // L'intercepteur gère automatiquement les erreurs 401
    if (!this.authService.isConnecte()) {
      console.warn('Utilisateur non connecté. Redirection vers la page de connexion.');
      this.router.navigate(['/connexion']);
      return;
    }

    // 🔹 Récupérer l'utilisateur depuis le service (plus fiable)
    const user = this.authService.getUtilisateurConnecte();
    if (user) {
      this.utilisateurConnecte = this.normalizeUser(user);
      console.log('Utilisateur récupéré depuis le service :', user);
    } else {
      // 🔹 Si pas d'utilisateur dans le service, faire une requête
      this.loadUserFromAPI();
    }
  }

  private loadUserFromAPI(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<Utilisateur>(`${this.API_BASE}/utilisateurs/me`, { headers }).subscribe({
      next: (u) => {
        console.log('Utilisateur récupéré avec succès :', u);
        this.utilisateurConnecte = this.normalizeUser(u);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de l\'utilisateur :', err);
        // 🚫 SUPPRIMÉ: Pas de redirection manuelle, l'intercepteur s'en charge
      }
    });
  }

    private normalizeUser(u: any): Utilisateur {
    return {
      id: u?.id ?? u?._id ?? u?.uuid,
      nom: (u?.nom ?? u?.lastName ?? '').trim(),
      prenom: (u?.prenom ?? u?.firstName ?? '').trim(),
      email: u?.email ?? '',
      telephone: u?.telephone ?? '',
      dateNaissance: u?.dateNaissance ?? undefined,
      role: u?.role ?? '',
    };
  }

  // Handlers communs
  navigateToDocuments() {
    this.router.navigate(['/membre/documents']);
  }

  navigateToPaiements() {
    this.router.navigate(['/membre/paiements']);
  }

  navigateToCommandes() {
    this.router.navigate(['/membre/commandes']);
  }

  navigateToEvenements() {
    this.router.navigate(['/membre/evenements']);
  }
}
