import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService, Utilisateur } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

type RoleUp = 'ADMIN' | 'MEMBRE' | 'PARENT';

@Component({
  selector: 'app-connected-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './connected-header.component.html',
  styleUrls: ['./connected-header.component.css']
})
export class ConnectedHeaderComponent implements OnInit {
  @Input() role: 'admin' | 'membre' | 'parent' = 'membre';
  
  // Propriétés pour le dropdown utilisateur
  userDropdownOpen = false;
  
  // Notifications
  notificationsOpen = false;
  notifications: any[] = [];
  unreadCount = 0;
  
  private readonly API_BASE = environment.apiUrl;

  // Clés de stockage
  private readonly ROLE_KEY = 'role';
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user'; // si tu stockes un user JSON
  
  // Auth
  user: Utilisateur | null = null;
  enfants: { prenom: string; nom: string }[] = [];
  enfantsLoaded = false;

  constructor(private router: Router, private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    console.log('🔍 Connected-header ngOnInit');
    console.log('🔍 Token:', localStorage.getItem('token') || localStorage.getItem('auth_token'));
    console.log('🔍 Role:', localStorage.getItem('role'));
    console.log('🔍 User:', localStorage.getItem('utilisateur'));
    
    // Suivi de l'état d'auth
    this.auth.authState$.subscribe((state) => {
      this.user = state.user;
      if (this.isParent() && !this.enfantsLoaded) {
        this.loadEnfants();
      }
    });
    
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
      case 'ADMIN': this.router.navigate(['/admin/dashboard-admin']); break;
      case 'MEMBRE': this.router.navigate(['/membre/dashboard-membre']); break;
      case 'PARENT': this.router.navigate(['/parent/dashboard-parent']); break;
      default: this.router.navigate(['/connexion']); break;
    }
  }

  goToProfil(): void {
    this.router.navigate(['/profil']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/'], { replaceUrl: true });
  }

  // ===== Dropdown utilisateur =====
  toggleUserDropdown(): void {
    this.userDropdownOpen = !this.userDropdownOpen;
    if (this.userDropdownOpen) {
      this.notificationsOpen = false;
    }
  }

  closeUserDropdown(): void {
    this.userDropdownOpen = false;
  }

  getUserName(): string {
    if (!this.user) return '';

    const isParent = this.isParent();
    if (!isParent) {
      return `${this.user.prenom ?? ''} ${this.user.nom ?? ''}`.trim();
    }

    // Récupérer potentiels champs parent (multiples conventions)
    const candidatsPrenom: (string | undefined)[] = [
      (this.user as any).prenomParent,
      (this.user as any).parentPrenom,
      (this.user as any).prenom_adulte,
      (this.user as any).prenomAdulte,
      (this.user as any).prenom_parent,
      this.user.prenom,
    ];
    const candidatsNom: (string | undefined)[] = [
      (this.user as any).nomParent,
      (this.user as any).parentNom,
      (this.user as any).nom_adulte,
      (this.user as any).nomAdulte,
      (this.user as any).nom_parent,
      this.user.nom,
    ];

    const norm = (v?: string) => (v || '').trim();
    const prenomsNettoyes = candidatsPrenom.filter(v => !!norm(v));
    const nomsNettoyes = candidatsNom.filter(v => !!norm(v));

    // Si backend a injecté une liste d'enfants dans le user (parfois pratique), on tente de ne pas confondre
    const tousEnfants = this.enfants.length > 0
      ? this.enfants
      : (Array.isArray((this.user as any).enfants) ? (this.user as any).enfants : []);
    const enfantsCombinaisons = new Set(
      (tousEnfants as any[]).map(e => `${norm(e.prenom).toLowerCase()}|${norm(e.nom).toLowerCase()}`)
    );

    for (const p of prenomsNettoyes) {
      for (const n of nomsNettoyes) {
        const key = `${norm(p).toLowerCase()}|${norm(n).toLowerCase()}`;
        if (!enfantsCombinaisons.has(key)) {
          return `${norm(p)} ${norm(n)}`.trim();
        }
      }
    }

    // Fallback : afficher un identifiant parent générique
    const emailPrefix = this.user.email ? this.user.email.split('@')[0] : '';
    const fallback = emailPrefix ? `Parent (${emailPrefix})` : 'Parent';
    return fallback;
  }

  private async loadEnfants(): Promise<void> {
    this.enfantsLoaded = true; // éviter appels multiples
    try {
      const base = environment.apiUrl;
      const list = await this.http.get<any[]>(`${base}/membres/mes-enfants`).toPromise();
      if (Array.isArray(list)) {
        this.enfants = list.map(e => ({ prenom: e.prenom || '', nom: e.nom || '' }));
      }
    } catch (e) {
      console.warn('[connected-header] Impossible de charger les enfants', e);
    }
  }

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

  // ===== Notifications =====
  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.userDropdownOpen = false;
    }
  }

  closeNotifications(): void {
    this.notificationsOpen = false;
  }

  loadNotifications(): void {
    this.http.get<any[]>(`${this.API_BASE}/notifications`).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.unreadCount = notifications.filter(n => !n.lu).length;
      },
      error: (err) => {
        console.error('❌ Erreur notifications (connected-header):', err);
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }

  markAsRead(notification: any): void {
    if (!notification.lu) {
      notification.lu = true;
      this.unreadCount--;
      this.http.put(`${this.API_BASE}/notifications/${notification.id}/read`, {}).subscribe({
        error: (err) => console.error('Erreur marquage notification:', err)
      });
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.lu = true);
    this.unreadCount = 0;
    this.http.put(`${this.API_BASE}/notifications/mark-all-read`, {}).subscribe({
      error: (err) => console.error('Erreur marquage global:', err)
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
