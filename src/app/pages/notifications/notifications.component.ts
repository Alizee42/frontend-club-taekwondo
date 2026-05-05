import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Notification, NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  filter: 'all' | 'unread' | 'read' = 'all';
  loading = true;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.notifications$.subscribe({
      next: (notifs: Notification[]) => {
        this.notifications = notifs.sort((a: Notification, b: Notification) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    switch (this.filter) {
      case 'unread':
        this.filteredNotifications = this.notifications.filter(n => !n.lu);
        break;
      case 'read':
        this.filteredNotifications = this.notifications.filter(n => n.lu);
        break;
      default:
        this.filteredNotifications = this.notifications;
    }
  }

  setFilter(f: 'all' | 'unread' | 'read'): void {
    this.filter = f;
    this.applyFilter();
  }

  markAsRead(notif: Notification): void {
    if (!notif.lu) {
      this.notificationService.markAsRead(notif.id).subscribe();
      notif.lu = true;
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
    this.notifications.forEach(n => n.lu = true);
    this.applyFilter();
  }

  navigateToAction(notif: Notification): void {
    if (notif.lienAction) {
      this.markAsRead(notif);
      this.router.navigateByUrl(notif.lienAction);
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'paiement':
        return 'ri-bank-card-line';
      case 'evenement':
        return 'ri-calendar-event-line';
      case 'commande':
        return 'ri-shopping-bag-3-line';
      case 'utilisateur':
        return 'ri-user-add-line';
      default:
        return 'ri-notification-3-line';
    }
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.lu).length;
  }
}
