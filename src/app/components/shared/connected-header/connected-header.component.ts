import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService, Utilisateur } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

type RoleUp = 'ADMIN' | 'MEMBRE' | 'PARENT';

@Component({
  selector: 'app-connected-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connected-header.component.html',
  styleUrls: ['./connected-header.component.css']
})
export class ConnectedHeaderComponent implements OnInit {
  @Input() role: 'admin' | 'membre' | 'parent' = 'membre';
  
  // Propriétés pour le dropdown
  isDropdownOpen = false;
  
  // Propriétés pour les notifications
  notificationsOpen = false;
  notifications: any[] = [];
  unreadCount = 0;
  
  private readonly API_BASE = environment.apiUrl;

  // Clés de stockage centralisées
  private readonly ROLE_KEY = 'role';
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user'; // si tu stockes un user JSON

  
  // Auth
  user: Utilisateur | null = null;

  constructor(private router: Router, private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    // ⚠️ On n'impose plus une redirection vers /connexion dans le header.
    // Sinon au moindre petit souci de token/role, l'utilisateur saute.
    // La sécurité reste gérée via tes guards Angular + backend.
    
    // 🔍 DEBUG AUTHENTIFICATION
    console.log('🔍 Connected-header ngOnInit');
    console.log('🔍 Token dans localStorage:', localStorage.getItem('token') || localStorage.getItem('auth_token'));
    console.log('🔍 Role dans localStorage:', localStorage.getItem('role'));
    console.log('🔍 User dans localStorage:', localStorage.getItem('utilisateur'));
    
    // S'abonner aux changements d'état d'authentification
    this.auth.authState$.subscribe((state) => {
      console.log('🔍 Connected-header authState change:', state);
      this.user = state.user;
    });
    
    // Charger les notifications au démarrage
    this.loadNotifications();
  }

  /** Récupère le rôle stocké */
  private getStoredRole(): RoleUp | null {
    const raw = localStorage.getItem(this.ROLE_KEY);
    if (!raw) return null;
    const up = raw.trim().toUpperCase();
    if (up === 'ADMIN' || up === 'MEMBRE' || up === 'PARENT') return up;
    return null;
  }

  goToDashboard(): void {
    const storedRole = this.getStoredRole();
    switch (storedRole) {
      case 'ADMIN':
        this.router.navigate(['/admin/dashboard-admin']);
        break;
      case 'MEMBRE':
        this.router.navigate(['/membre/dashboard-membre']);
        break;
      case 'PARENT':
        this.router.navigate(['/parent/dashboard-parent']);
        break;
      default:
        this.router.navigate(['/connexion']);
        break;
    }
  }

  goToHome(): void {
    // ✅ Correction : on va directement à l'accueil public
    // sans vérifier le token ni toucher à la session
    this.router.navigate(['/accueil']); // adapte selon ta route publique
  }

  goToProfil(): void {
    this.router.navigate(['/profil']);
  }

  logout(): void {
    // Utiliser le même service que le header normal
    this.auth.logout();
    this.router.navigate(['/'], { replaceUrl: true });
  }

  // ===== MÉTHODES DROPDOWN =====
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    // Fermer les notifications si ouvertes
    if (this.isDropdownOpen) {
      this.notificationsOpen = false;
    }
  }

  getUserName(): string {
    if (!this.user) return '';
    
    // 🔍 DEBUG TEMPORAIRE
    console.log('🔍 Connected-header this.user:', this.user);
    console.log('🔍 Connected-header localStorage utilisateur:', localStorage.getItem('utilisateur'));
    
    // Pour un parent, utiliser le vrai nom du parent s'il est disponible
    if (this.isParent() && this.user['nomParent'] && this.user['prenomParent']) {
      console.log('✅ Utilise nomParent/prenomParent:', this.user['prenomParent'], this.user['nomParent']);
      return `${this.user['prenomParent']} ${this.user['nomParent']}`;
    }
    
    console.log('❌ Utilise prenom/nom normal:', this.user.prenom, this.user.nom);
    return `${this.user.prenom} ${this.user.nom}`;
  }

  // ======= Utils (même logique que header normal) =======
  private isParent(): boolean {
    const role = (this.user?.role ?? this.auth.getRole() ?? '').toString().toUpperCase();
    return role === 'PARENT';
  }

  getUserInitials(): string {
    const userName = this.getUserName();
    const words = userName.split(' ').filter(word => word.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  goToSettings(): void {
    this.router.navigate(['/parametres']);
  }

  // ======= Méthodes pour les notifications =======
  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    // Fermer le dropdown utilisateur si ouvert
    if (this.notificationsOpen) {
      this.isDropdownOpen = false;
    }
  }

  closeNotifications(): void {
    this.notificationsOpen = false;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
    this.notificationsOpen = false; // Fermer aussi les notifications
  }

  loadNotifications(): void {
    // Charger les notifications depuis votre backend
    console.log('🔔 Chargement des notifications depuis le backend (connected-header)...');
    this.http.get<any[]>(`${this.API_BASE}/notifications`).subscribe({
      next: (notifications) => {
        console.log('✅ Notifications reçues (connected-header):', notifications);
        this.notifications = notifications;
        this.unreadCount = notifications.filter(n => !n.lu).length;
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des notifications (connected-header):', err);
        // Pas de fallback - si pas de backend, pas de notifications
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }

  markAsRead(notification: any): void {
    if (!notification.lu) {
      notification.lu = true;
      this.unreadCount--;
      
      // Envoyer au backend
      this.http.put(`${this.API_BASE}/notifications/${notification.id}/read`, {}).subscribe({
        error: (err) => console.error('Erreur lors du marquage comme lu:', err)
      });
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.lu = true);
    this.unreadCount = 0;
    
    // Envoyer au backend
    this.http.put(`${this.API_BASE}/notifications/mark-all-read`, {}).subscribe({
      error: (err) => console.error('Erreur lors du marquage global:', err)
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'cours': return 'ri-calendar-line';
      case 'paiement': return 'ri-money-euro-circle-line';
      case 'examen': return 'ri-medal-line';
      default: return 'ri-notification-line';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }
}