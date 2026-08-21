import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EvenementService } from './evenement.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/inscriptions`;
const API_ME = `${environment.apiUrl}/inscriptions/me`;
const API_EVT = `${environment.apiUrl}/evenements`;

describe('EvenementService', () => {
  let service: EvenementService;
  let httpMock: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', ['getUserIdFromToken', 'getToken', 'getRole']);
    authSpy.getUserIdFromToken.and.returnValue(1);
    authSpy.getToken.and.returnValue('fake-token');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EvenementService,
        { provide: AuthService, useValue: authSpy }
      ]
    });
    service = TestBed.inject(EvenementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // EVT-02 : Inscription d'un membre à un événement (route /inscriptions/me)
  // -----------------------------------------------------------------------
  it('[EVT-02] inscrireMembreEvenement – POST /inscriptions/me retourne l\'inscription', () => {
    const response = { id: 10, evenementId: 5, utilisateurId: 1, statut: 'CONFIRME', dateInscription: '2026-04-10' };
    let result: any;

    service.inscrireMembreEvenement(5).subscribe(r => (result = r));

    const req = httpMock.expectOne(API_ME);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.evenementId).toBe(5);
    req.flush(response);
    expect(result.id).toBe(10);
  });

  // -----------------------------------------------------------------------
  // EVT-03 : Inscription d'un enfant (parent) à un événement
  // -----------------------------------------------------------------------
  it('[EVT-03] inscrireEnfantEvenement – POST /inscriptions avec membreIds', () => {
    const response = { id: 11, evenementId: 5, membreId: 3, statut: 'CONFIRME', dateInscription: '2026-04-10' };
    let result: any;

    service.inscrireEnfantEvenement(5, 3).subscribe(r => (result = r));

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.membreIds[0]).toBe(3);
    req.flush(response);
    expect(result.id).toBe(11);
  });

  // -----------------------------------------------------------------------
  // EVT-04 : Création d'un événement par admin
  // -----------------------------------------------------------------------
  it('[EVT-04] ajouterEvenement – POST /evenements crée l\'événement', () => {
    const fd = new FormData();
    fd.append('titre', 'Tournoi 2026');
    const response = { id: 1, titre: 'Tournoi 2026', actif: true };
    let result: any;

    service.ajouterEvenement(fd).subscribe(r => (result = r));

    const req = httpMock.expectOne(API_EVT);
    expect(req.request.method).toBe('POST');
    req.flush(response);
    expect(result.id).toBe(1);
  });

  // -----------------------------------------------------------------------
  // EVT-05 : Inscription à un événement complet → 409
  // -----------------------------------------------------------------------
  it('[EVT-05] inscrireMembreEvenement – retour 409 si événement complet', () => {
    let errorStatus = 0;

    service.inscrireMembreEvenement(5).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(API_ME);
    req.flush({ message: 'Capacité maximale atteinte' }, { status: 409, statusText: 'Conflict' });
    expect(errorStatus).toBe(409);
  });

  // -----------------------------------------------------------------------
  // EVT-06 : Création sans date → 400
  // -----------------------------------------------------------------------
  it('[EVT-06] ajouterEvenement – retour 400 si date manquante', () => {
    const fd = new FormData();
    fd.append('titre', 'Sans date');
    let errorStatus = 0;

    service.ajouterEvenement(fd).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(API_EVT);
    req.flush({ message: 'Date obligatoire' }, { status: 400, statusText: 'Bad Request' });
    expect(errorStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // EVT-07 : Membre modifie un événement → 403
  // -----------------------------------------------------------------------
  it('[EVT-07] modifierEvenement – retour 403 pour un membre', () => {
    const fd = new FormData();
    fd.append('titre', 'Modif');
    let errorStatus = 0;

    service.modifierEvenement(1, fd).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(`${API_EVT}/1`);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });

  // -----------------------------------------------------------------------
  // EVT-08 : Parent voit les inscriptions d'autres familles → 403
  // -----------------------------------------------------------------------
  it('[EVT-08] getInscritsEvenement – retour 403 si parent essaie de voir tout', () => {
    let errorStatus = 0;

    service.getInscritsEvenement(5).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(`${API_EVT}/5/inscrits`);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });
});

