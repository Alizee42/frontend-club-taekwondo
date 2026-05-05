import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService, Notification } from './notification.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/notifications`;

const mockNotifications: Notification[] = [
  { id: 1, titre: 'Nouvel événement', message: 'Tournoi samedi', type: 'evenement', lu: false, date: '2026-05-01T10:00:00', utilisateurId: 1 },
  { id: 2, titre: 'Paiement reçu',   message: 'Cotisation validée', type: 'paiement', lu: true,  date: '2026-05-02T12:00:00', utilisateurId: 1 },
  { id: 3, titre: 'Info générale',   message: 'Fermeture lundi',    type: 'general',  lu: false, date: '2026-05-03T08:00:00', utilisateurId: 1 },
];

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopPolling();
    httpMock.verify();
  });

  // ── getAll ──────────────────────────────────────────────────
  it('[NOTIF-01] getAll() envoie GET /api/notifications', () => {
    let result: Notification[] = [];
    service.getAll().subscribe(n => (result = n));

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush(mockNotifications);

    expect(result.length).toBe(3);
    expect(result[0].titre).toBe('Nouvel événement');
  });

  it('[NOTIF-02] getAll() retourne [] en cas d\'erreur réseau', () => {
    let result: Notification[] = [];
    service.getAll().subscribe(n => (result = n));

    const req = httpMock.expectOne(API);
    req.flush('Erreur serveur', { status: 500, statusText: 'Internal Server Error' });

    expect(result).toEqual([]);
  });

  // ── markAsRead ───────────────────────────────────────────────
  it('[NOTIF-03] markAsRead(1) envoie PUT /api/notifications/1/read', () => {
    service.markAsRead(1).subscribe();

    const req = httpMock.expectOne(`${API}/1/read`);
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'OK' });
  });

  // ── markAllAsRead ─────────────────────────────────────────────
  it('[NOTIF-04] markAllAsRead() envoie PUT /api/notifications/mark-all-read', () => {
    service.markAllAsRead().subscribe();

    const req = httpMock.expectOne(`${API}/mark-all-read`);
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'OK' });
  });

  // ── delete ────────────────────────────────────────────────────
  it('[NOTIF-05] delete(2) envoie DELETE /api/notifications/2', () => {
    service.delete(2).subscribe();

    const req = httpMock.expectOne(`${API}/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Supprimé' });
  });

  // ── unreadCount$ ──────────────────────────────────────────────
  it('[NOTIF-06] unreadCount$ compte uniquement les non lues', fakeAsync(() => {
    let count = -1;
    service.unreadCount$.subscribe(c => (count = c));

    // Injecter manuellement via refresh()
    service.refresh();
    const req = httpMock.expectOne(API);
    req.flush(mockNotifications); // 2 non lues (id 1 et 3)

    tick();
    expect(count).toBe(2);
  }));

  it('[NOTIF-07] unreadCount$ vaut 0 quand toutes sont lues', fakeAsync(() => {
    let count = -1;
    service.unreadCount$.subscribe(c => (count = c));

    service.refresh();
    const req = httpMock.expectOne(API);
    req.flush([{ ...mockNotifications[0], lu: true }, { ...mockNotifications[1], lu: true }]);

    tick();
    expect(count).toBe(0);
  }));

  // ── stopPolling ───────────────────────────────────────────────
  it('[NOTIF-08] stopPolling() vide la liste et émet []', fakeAsync(() => {
    let lastList: Notification[] = [{ id: 99 } as any];
    service.notifications$.subscribe(n => (lastList = n));

    service.stopPolling();
    tick();

    expect(lastList).toEqual([]);
  }));

  // ── refresh ───────────────────────────────────────────────────
  it('[NOTIF-09] refresh() met à jour notifications$', fakeAsync(() => {
    let emitted: Notification[] = [];
    service.notifications$.subscribe(n => (emitted = n));

    service.refresh();
    const req = httpMock.expectOne(API);
    req.flush([mockNotifications[0]]);
    tick();

    expect(emitted.length).toBe(1);
    expect(emitted[0].id).toBe(1);
  }));
});
