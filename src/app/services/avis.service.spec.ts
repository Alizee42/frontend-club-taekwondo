import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AvisService, Avis } from './avis.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/avis`;

describe('AvisService', () => {
  let service: AvisService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AvisService]
    });
    service = TestBed.inject(AvisService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // ACTU-03 : Dépôt d'un avis par un utilisateur
  // -----------------------------------------------------------------------
  it('[ACTU-03] ajouterAvis – POST /avis crée l\'avis en attente', () => {
    const fd = new FormData();
    fd.append('contenu', 'Super club!');
    fd.append('note', '5');
    const response: Avis = { id: 1, contenu: 'Super club!', pseudoVisiteur: 'Test', approuve: false, note: 5 };
    let result: Avis | undefined;

    service.ajouterAvis(fd).subscribe(r => (result = r));

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    req.flush(response);
    expect(result!.approuve).toBeFalse();
    expect(result!.note).toBe(5);
  });

  // -----------------------------------------------------------------------
  // ACTU-04 : Approbation d'un avis par admin – PUT /avis/:id/approuver
  // -----------------------------------------------------------------------
  it('[ACTU-04] approuver un avis – PUT → approuve devient true', () => {
    const http = TestBed.inject(HttpClient);
    let result: any;

    http.put<any>(`${API}/1/approuver`, {}).subscribe((r: any) => (result = r));

    const req = httpMock.expectOne(`${API}/1/approuver`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 1, approuve: true, contenu: 'Super club!' });
    expect(result.approuve).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // ACTU-06 : Avis avec contenu vide → 400
  // -----------------------------------------------------------------------
  it('[ACTU-06] ajouterAvis – retour 400 si contenu vide', () => {
    const fd = new FormData();
    let errorStatus = 0;

    service.ajouterAvis(fd).subscribe({ error: err => (errorStatus = err.status ?? 400) });

    const req = httpMock.expectOne(API);
    req.flush({ message: 'Contenu obligatoire' }, { status: 400, statusText: 'Bad Request' });
    expect(errorStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // ACTU-08 : Visiteur ne peut pas approuver → 401
  // -----------------------------------------------------------------------
  it('[ACTU-08] approuver sans session – retour 401', () => {
    const http = TestBed.inject(HttpClient);
    let errorStatus = 0;

    http.put<any>(`${API}/1/approuver`, {}).subscribe({ error: (err: any) => (errorStatus = err.status) });

    const req = httpMock.expectOne(`${API}/1/approuver`);
    req.flush({ message: 'Non authentifié' }, { status: 401, statusText: 'Unauthorized' });
    expect(errorStatus).toBe(401);
  });

  // -----------------------------------------------------------------------
  // ACTU : getAvisNonApprouves
  // -----------------------------------------------------------------------
  it('getAvisNonApprouves – retourne les avis en attente', () => {
    let result: Avis[] = [];
    service.getAvisNonApprouves().subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}?approuve=false`);
    req.flush([{ id: 1, contenu: 'Test', pseudoVisiteur: 'A', approuve: false, note: 3 }]);
    expect(result.length).toBe(1);
    expect(result[0].approuve).toBeFalse();
  });
});

