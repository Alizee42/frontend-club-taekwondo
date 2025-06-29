import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { DashboardStats } from '../models/dashboard-stats.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentAdminService {
  private apiUrl = '/api/paiements';

  private dashboardStatsSubject = new BehaviorSubject<DashboardStats | null>(null);
  dashboardStats$ = this.dashboardStatsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /** 🔄 Récupère les stats et met à jour le flux */
  refreshDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      tap(stats => this.dashboardStatsSubject.next(stats))
    );
  }

  /** 🧩 Appelé après chaque ajout/annulation de paiement */
  forceRefreshDashboard(): void {
    this.refreshDashboardStats().subscribe(); // déclenche un push
  }
}
