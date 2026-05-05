import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription, interval, switchMap, startWith, catchError, of, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  id: number;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  date: string;
  utilisateurId: number;
  lienAction?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private pollingSub: Subscription | null = null;
  private notifsSub = new BehaviorSubject<Notification[]>([]);

  notifications$ = this.notifsSub.asObservable();
  unreadCount$   = this.notifications$.pipe(map(list => list.filter(n => !n.lu).length));

  constructor(private http: HttpClient) {}

  getAll(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl).pipe(
      catchError(() => of([]))
    );
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/mark-all-read`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  refresh(): void {
    this.getAll().subscribe(list => this.notifsSub.next(list));
  }

  startPolling(): void {
    if (this.pollingSub) return;
    this.pollingSub = interval(60_000).pipe(
      startWith(0),
      switchMap(() => this.getAll())
    ).subscribe(list => this.notifsSub.next(list));
  }

  stopPolling(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = null;
    this.notifsSub.next([]);
  }
}
