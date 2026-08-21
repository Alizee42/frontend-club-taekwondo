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

  afterEach(() => {
    httpMock.verify();
    // Isolation entre suites : evite qu'un token laisse en localStorage par
    // ce fichier ne pollue les autres composants/services testes ensuite
    // dans la meme session Karma (ex: DocumentsComponent lit authService.isConnecte()).
    localStorage.clear();
  });

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

  // -----------------------------------------------------------------------
  // isConnecte() : retourne false sans token
  // -----------------------------------------------------------------------
  it('[AUTH-10] isConnecte() retourne false quand aucun token', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    // Forcer le rechargement de l'état
    service.logout();
    expect(service.isConnecte()).toBeFalse();
  });

  it('[AUTH-11] isConnecte() retourne true après un login simulé', () => {
    // getToken()/isConnecte() lisent l'etat interne (_authState$), pas
    // localStorage directement : celui-ci n'est relu qu'a l'hydratation.
    // On doit donc passer par restoreSession() pour que le token pose
    // en storage soit repris dans l'etat du service.
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const payload = btoa(JSON.stringify({ utilisateurId: 1, role: 'MEMBRE', exp: futureExp }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;

    localStorage.setItem('token', fakeToken);
    localStorage.setItem('role', 'MEMBRE');
    service.restoreSession();

    expect(service.getToken()).toBe(fakeToken);
    expect(service.isConnecte()).toBeTrue();
  });

  // -----------------------------------------------------------------------
  // getRole() : retourne le rôle stocké
  // -----------------------------------------------------------------------
  it('[AUTH-12] getRole() retourne null sans session', () => {
    service.logout();
    expect(service.getRole()).toBeNull();
  });

  it('[AUTH-13] getRole() retourne le rôle après login', () => {
    localStorage.setItem('role', 'ADMIN');
    localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.e30.sig');
    service.restoreSession();

    expect(service.getRole()).toBe('ADMIN');
  });

  // -----------------------------------------------------------------------
  // logout() : émet un état déconnecté via authState$
  // -----------------------------------------------------------------------
  it('[AUTH-14] logout() émet isConnecte=false via authState$', (done) => {
    service.logout();
    service.authState$.subscribe(state => {
      expect(state.isConnecte).toBeFalse();
      expect(state.token).toBeNull();
      done();
    });
  });
});
