import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GalerieService, Galerie } from './galerie.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/galeries`;

describe('GalerieService', () => {
  let service: GalerieService;
  let httpMock: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', ['getToken', 'getRole', 'getUtilisateurConnecte']);
    authSpy.getToken.and.returnValue('fake-token');
    authSpy.getRole.and.returnValue('ADMIN');
    authSpy.getUtilisateurConnecte.and.returnValue({ id: 1, clubId: 1 } as any);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        GalerieService,
        { provide: AuthService, useValue: authSpy }
      ]
    });
    service = TestBed.inject(GalerieService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // GAL-02 : Publication d'une galerie photo → POST /galeries
  // -----------------------------------------------------------------------
  it('[GAL-02] create – POST /galeries retourne la galerie créée', () => {
    const payload = { titre: 'Tournoi 2026', description: 'Photos', clubId: 1 };
    const response: Galerie = { id: '3', titre: 'Tournoi 2026', imageUrl: 'img.jpg', description: 'Photos' };
    let result: any;

    service.create(payload).subscribe(r => (result = r));

    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    req.flush(response);
    expect(result!.titre).toBe('Tournoi 2026');
  });

  // -----------------------------------------------------------------------
  // GAL-03 : Suppression d'une galerie → DELETE → 204
  // -----------------------------------------------------------------------
  it('[GAL-03] delete – DELETE /galeries/:id supprime la galerie', () => {
    let called = false;

    service.delete('3').subscribe(() => (called = true));

    const req = httpMock.expectOne(`${API}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(called).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // GAL-04 : Upload avec type de fichier invalide → 400
  // -----------------------------------------------------------------------
  it('[GAL-04] create – retour 400 si fichier invalide', () => {
    const payload = { titre: 'Invalide', description: '', clubId: 1 };
    let errorStatus = 0;

    service.create(payload).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(API);
    req.flush({ message: 'Format invalide' }, { status: 400, statusText: 'Bad Request' });
    expect(errorStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // GAL-05 : Accès à un média inexistant → 404
  // -----------------------------------------------------------------------
  it('[GAL-05] getById – retour 404 si média inexistant', () => {
    let errorStatus = 0;

    service.getById('9999').subscribe({ error: err => (errorStatus = err.status ?? 404) });

    const req = httpMock.expectOne(`${API}/9999`);
    req.flush({ message: 'Galerie introuvable' }, { status: 404, statusText: 'Not Found' });
    expect(errorStatus).toBe(404);
  });

  // -----------------------------------------------------------------------
  // GAL-06 : Membre tente de publier → 403
  // -----------------------------------------------------------------------
  it('[GAL-06] create avec rôle MEMBRE – retour 403', () => {
    authSpy.getRole.and.returnValue('MEMBRE');
    const payload = { titre: 'Membre pub', description: '', clubId: 1 };
    let errorStatus = 0;

    service.create(payload).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(API);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });

  // -----------------------------------------------------------------------
  // GAL-07 : Admin hors club modifie → 403
  // -----------------------------------------------------------------------
  it('[GAL-07] update hors périmètre – retour 403', () => {
    const galerie: Galerie = { id: '1', titre: 'Test', imageUrl: 'img.jpg', description: '' };
    let errorStatus = 0;

    service.update('1', galerie).subscribe({ error: err => (errorStatus = err.status) });

    const req = httpMock.expectOne(`${API}/1`);
    req.flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(errorStatus).toBe(403);
  });

  // -----------------------------------------------------------------------
  // GAL : getGaleriesByClub – liste les galeries du club
  // -----------------------------------------------------------------------
  it('getGaleriesByClub – retourne les galeries du club', () => {
    const galeries: Galerie[] = [{ id: '1', titre: 'Test', imageUrl: 'img.jpg', description: '' }];
    let result: Galerie[] = [];

    service.getGaleriesByClub(1).subscribe(r => (result = r));

    const req = httpMock.expectOne(`${API}/club/1`);
    req.flush(galeries);
    expect(result.length).toBe(1);
  });
});

