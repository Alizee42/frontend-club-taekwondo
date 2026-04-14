import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { ConnectedHeaderComponent } from './connected-header.component';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { of } from 'rxjs';

const API_NOTIF = `${environment.apiUrl}/notifications`;

describe('ConnectedHeaderComponent – Notifications', () => {
  let component: ConnectedHeaderComponent;
  let fixture: ComponentFixture<ConnectedHeaderComponent>;
  let httpMock: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;

  const mockNotifs = [
    { id: 1, message: 'Paiement reçu', lu: false, type: 'paiement' },
    { id: 2, message: 'Événement demain', lu: true, type: 'cours' },
  ];

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['getRole', 'getToken', 'getUtilisateurConnecte', 'logout']);
    authSpy.getRole.and.returnValue('MEMBRE');
    authSpy.getToken.and.returnValue('fake-token');
    authSpy.getUtilisateurConnecte.and.returnValue({ id: 1, nom: 'Test', prenom: 'U' } as any);
    (authSpy as any).authState$ = of({ user: null, isConnecte: false });

    await TestBed.configureTestingModule({
      imports: [ConnectedHeaderComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authSpy }]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConnectedHeaderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Flush notifications non traitées
    httpMock.match(() => true).forEach(r => r.flush([]));
    httpMock.verify();
  });

  it('should create', () => {
    // fixture.detectChanges() déclenche ngOnInit → loadNotifications() → GET /notifications
    fixture.detectChanges();
    const req = httpMock.expectOne(API_NOTIF);
    req.flush([]);
    expect(component).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // NOTIF-02 : Marquage d'une notification en lue
  // -----------------------------------------------------------------------
  it('[NOTIF-02] markAsRead – PUT /notifications/:id/read marque la notif en lue', () => {
    // flush ngOnInit
    fixture.detectChanges();
    const initReq = httpMock.expectOne(API_NOTIF);
    initReq.flush(mockNotifs);

    component.notifications = [{ id: 1, message: 'Test', lu: false }];
    component.unreadCount = 1;

    component.markAsRead(component.notifications[0]);

    const req = httpMock.expectOne(`${API_NOTIF}/1/read`);
    expect(req.request.method).toBe('PUT');
    req.flush({});

    expect(component.notifications[0].lu).toBeTrue();
    expect(component.unreadCount).toBe(0);
  });

  // -----------------------------------------------------------------------
  // NOTIF-03 : Admin envoie une notification → POST /notifications
  // -----------------------------------------------------------------------
  it('[NOTIF-03] envoi d\'une notification par admin – POST /notifications', () => {
    // flush ngOnInit
    fixture.detectChanges();
    const initReq = httpMock.expectOne(API_NOTIF);
    initReq.flush([]);

    const http = TestBed.inject(HttpClient);
    const payload = { message: 'Séance annulée', cible: 'TOUS', type: 'cours' };
    let result: any;

    http.post<any>(API_NOTIF, payload).subscribe((r: any) => (result = r));

    const req = httpMock.expectOne(API_NOTIF);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, ...payload });
    expect(result.id).toBe(10);
  });

  // -----------------------------------------------------------------------
  // NOTIF-04 : Marquage comme lue d'une notification inexistante → 404
  // -----------------------------------------------------------------------
  it('[NOTIF-04] markAsRead avec ID inexistant – PUT retourne 404', () => {
    // flush ngOnInit
    fixture.detectChanges();
    const initReq = httpMock.expectOne(API_NOTIF);
    initReq.flush([]);

    const http = TestBed.inject(HttpClient);
    let errorStatus = 0;

    http.put<any>(`${API_NOTIF}/9999/read`, {}).subscribe({
      error: (err: any) => (errorStatus = err.status)
    });

    const req = httpMock.expectOne(`${API_NOTIF}/9999/read`);
    req.flush({ message: 'Introuvable' }, { status: 404, statusText: 'Not Found' });
    expect(errorStatus).toBe(404);
  });

  // -----------------------------------------------------------------------
  // NOTIF-06 : Membre ne peut pas envoyer une notification système → 403
  // -----------------------------------------------------------------------
  it('[NOTIF-06] envoi de notification par MEMBRE – retour 403', () => {
    // flush ngOnInit
    fixture.detectChanges();
    const initReq = httpMock.expectOne(API_NOTIF);
    initReq.flush([]);

    const http = TestBed.inject(HttpClient);
    let errorStatus = 0;

    http.post<any>(API_NOTIF, { message: 'Hack', cible: 'TOUS' }).subscribe({
      error: (err: any) => (errorStatus = err.status)
    });

    const req = httpMock.expectOne(API_NOTIF);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });

  // -----------------------------------------------------------------------
  // NOTIF : markAllAsRead – PUT /notifications/mark-all-read
  // -----------------------------------------------------------------------
  it('markAllAsRead – PUT /notifications/mark-all-read vide le compteur', () => {
    // flush ngOnInit
    fixture.detectChanges();
    const initReq = httpMock.expectOne(API_NOTIF);
    initReq.flush(mockNotifs);

    component.notifications = [{ id: 1, lu: false }, { id: 2, lu: false }];
    component.unreadCount = 2;

    component.markAllAsRead();

    const req = httpMock.expectOne(`${API_NOTIF}/mark-all-read`);
    expect(req.request.method).toBe('PUT');
    req.flush({});

    expect(component.unreadCount).toBe(0);
    expect(component.notifications.every(n => n.lu)).toBeTrue();
  });
});

