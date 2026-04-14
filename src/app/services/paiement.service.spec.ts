import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { PaiementService, Paiement } from './paiement.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/paiements`;

describe('PaiementService', () => {
  let service: PaiementService;
  let httpMock: HttpTestingController;
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PaiementService);
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // PAI-03 : Ajout manuel d'un paiement par admin → POST /paiements/admin
  // -----------------------------------------------------------------------
  it('[PAI-03] ajout manuel paiement admin – POST retourne le paiement créé', () => {
    const payload = { utilisateurId: 1, membreId: 5, montantTotal: 150, type: 'UNIQUE', modePaiement: 'ESPECES', datePaiement: '2026-04-10' };
    const response: Paiement = { id: 99, montantTotal: 150, statut: 'en attente' };
    let result: any;

    http.post<any>(`${API}/admin`, payload).subscribe((r: any) => (result = r));

    const req = httpMock.expectOne(`${API}/admin`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
    expect(result.id).toBe(99);
    expect(result.statut).toBe('en attente');
  });

  // -----------------------------------------------------------------------
  // PAI-06 : Paiement avec montant négatif → 400
  // -----------------------------------------------------------------------
  it('[PAI-06] ajout paiement montant négatif – retour 400', () => {
    const payload = { utilisateurId: 1, montantTotal: -50, type: 'UNIQUE' };
    let errorStatus = 0;

    http.post<any>(`${API}/admin`, payload).subscribe({
      error: (err: any) => (errorStatus = err.status)
    });

    const req = httpMock.expectOne(`${API}/admin`);
    req.flush({ message: 'Montant invalide' }, { status: 400, statusText: 'Bad Request' });
    expect(errorStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // PAI-07 : Générer une facture pour un paiement inexistant → 404
  // -----------------------------------------------------------------------
  it('[PAI-07] getPaiement avec ID inexistant – retour 404', () => {
    let errorStatus = 0;

    service.getPaiement(9999).subscribe({
      error: err => (errorStatus = err.status ?? 404)
    });

    const req = httpMock.expectOne(`${API}/9999`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'Paiement introuvable' }, { status: 404, statusText: 'Not Found' });
    expect(errorStatus).toBe(404);
  });

  // -----------------------------------------------------------------------
  // PAI-09 : Parent crée paiement pour enfant non lié → 403
  // -----------------------------------------------------------------------
  it('[PAI-09] paiement pour enfant non lié – retour 403', () => {
    let errorStatus = 0;

    http.post<any>(`${API}/admin`, { membreId: 999, utilisateurId: 42, montantTotal: 100 }).subscribe({
      error: (err: any) => (errorStatus = err.status)
    });

    const req = httpMock.expectOne(`${API}/admin`);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });

  // -----------------------------------------------------------------------
  // PAI : getPaiementsByClub – liste les paiements du club
  // -----------------------------------------------------------------------
  it('getPaiementsByClub – retourne la liste de paiements', () => {
    const paiements: Paiement[] = [{ id: 1, montantTotal: 100 }, { id: 2, montantTotal: 200 }];
    let result: Paiement[] = [];

    service.getPaiementsByClub(1).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/club/1`);
    expect(req.request.method).toBe('GET');
    req.flush(paiements);
    expect(result.length).toBe(2);
  });
});
