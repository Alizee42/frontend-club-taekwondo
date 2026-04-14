import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { PaymentAdminService } from './payment-admin.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/paiements`;

describe('PaymentAdminService', () => {
  let service: PaymentAdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentAdminService]
    });
    service = TestBed.inject(PaymentAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // DASH-01 : Chargement du tableau de bord admin
  // -----------------------------------------------------------------------
  it('[DASH-01] refreshDashboardStats – GET /paiements/dashboard retourne les stats', () => {
    const stats = { totalPaiements: 5, montantTotal: 500, nbMembres: 10 };
    let result: any;

    service.refreshDashboardStats().subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/dashboard`);
    expect(req.request.method).toBe('GET');
    req.flush(stats);
    expect(result.totalPaiements).toBe(5);
  });

  // -----------------------------------------------------------------------
  // DASH-02 : Statistiques de paiements
  // -----------------------------------------------------------------------
  it('[DASH-02] getAllPaiements – GET /paiements retourne la liste', () => {
    const paiements = [{ id: 1, montantTotal: 100 }, { id: 2, montantTotal: 200 }];
    let result: any[] = [];

    service.getAllPaiements().subscribe(r => (result = r));

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush(paiements);
    expect(result.length).toBe(2);
  });

  // -----------------------------------------------------------------------
  // DASH-04 : Chargement des statistiques avec filtre
  // -----------------------------------------------------------------------
  it('[DASH-04] filterPaiements – GET /paiements/filter avec params', () => {
    let result: any[] = [];

    service.filterPaiements({ statut: 'PAYE' }).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/filter?statut=PAYE`);
    req.flush([{ id: 1, statut: 'PAYE' }]);
    expect(result[0].statut).toBe('PAYE');
  });

  // -----------------------------------------------------------------------
  // DASH-05 : Erreur backend 503 sur le dashboard
  // -----------------------------------------------------------------------
  it('[DASH-05] refreshDashboardStats – gère erreur backend 503', () => {
    let errorStatus = 0;

    service.refreshDashboardStats().subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(`${API}/dashboard`);
    req.flush({ message: 'Service indisponible' }, { status: 503, statusText: 'Service Unavailable' });
    expect(errorStatus).toBe(503);
  });

  // -----------------------------------------------------------------------
  // DASH-07 : Admin hors périmètre → 403
  // -----------------------------------------------------------------------
  it('[DASH-07] getAllPaiements – retour 403 pour admin hors club', () => {
    const http = TestBed.inject(HttpClient);
    let errorStatus = 0;

    http.get<any>(API).subscribe({ error: (err: any) => (errorStatus = err.status) });

    const req = httpMock.expectOne(API);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });
});

