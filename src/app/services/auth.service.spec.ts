import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    // flush l'appel éventuel de hydrateFromStorage s'il y en a
    httpMock.match(() => true).forEach(r => r.flush([]));
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // AUTH-07 : Demande de réinitialisation avec un email connu
  // -----------------------------------------------------------------------
  it('[AUTH-07] demanderReinit – POST /reinitialisation/demander avec email connu', () => {
    const email = 'membre@test.com';
    let successCalled = false;



    http
      .post<any>(`${environment.apiUrl}/reinitialisation/demander`, { email })
      .subscribe({ next: () => { successCalled = true; } });

    const req = httpMock.expectOne(`${environment.apiUrl}/reinitialisation/demander`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.email).toBe(email);
    req.flush({ message: 'Email envoyé' });

    expect(successCalled).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // AUTH-08 : Réinitialisation avec jeton invalide → 400
  // -----------------------------------------------------------------------
  it('[AUTH-08] reinitialisationAvecToken – retour 400 si token invalide', () => {
    let errorReceived = false;
    const payload = { token: 'faux-token', nouveauMotDePasse: 'Azert1!' };

    http
      .post<any>(`${environment.apiUrl}/reinitialisation/reinitialiser-mot-de-passe`, payload)
      .subscribe({ error: () => { errorReceived = true; } });

    const req = httpMock.expectOne(`${environment.apiUrl}/reinitialisation/reinitialiser-mot-de-passe`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Token invalide ou expiré' }, { status: 400, statusText: 'Bad Request' });

    expect(errorReceived).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // AUTH-08b : Vérification de jeton expiré → 400
  // -----------------------------------------------------------------------
  it('[AUTH-08b] verifierToken – retour 400 si token expiré', () => {
    let errorReceived = false;

    http
      .post<any>(`${environment.apiUrl}/reinitialisation/verifier`, { token: 'expired-token' })
      .subscribe({ error: () => { errorReceived = true; } });

    const req = httpMock.expectOne(`${environment.apiUrl}/reinitialisation/verifier`);
    req.flush({ message: 'Token expiré' }, { status: 400, statusText: 'Bad Request' });

    expect(errorReceived).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // logout() : Vide l'état auth et le localStorage
  // -----------------------------------------------------------------------
  it('logout() vide la session locale', () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('role', 'MEMBRE');
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(service.getRole()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
